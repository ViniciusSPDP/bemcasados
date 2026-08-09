//src/app/api/webhook/asaas/route.ts
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAsaasPayment } from "@/services/asaas";

/** Status do Asaas que significam dinheiro efetivamente reconhecido. */
const PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

const WebhookSchema = z.object({
    event: z.string(),
    payment: z.object({ id: z.string().min(1) }),
});

/** Comparação em tempo constante — `!==` vaza o token por timing. */
function tokenMatches(received: string | null, expected: string): boolean {
    if (!received) return false;

    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;

    return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    // Sem token configurado o endpoint fica fechado, e não aberto.
    if (!expectedToken) {
        console.error("ASAAS_WEBHOOK_TOKEN não configurado — webhook recusado.");
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!tokenMatches(req.headers.get("asaas-access-token"), expectedToken)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        // O corpo era desestruturado direto: um POST autenticado com body
        // malformado derrubava a rota em 500 ao ler `payment.id`.
        const parsed = WebhookSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ message: "Payload inválido" }, { status: 400 });
        }

        const { event, payment } = parsed.data;

        if (event !== "PAYMENT_RECEIVED" && event !== "PAYMENT_CONFIRMED") {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { asaasId: payment.id },
            select: { id: true, giftId: true, status: true, amountCharged: true, installments: true },
        });

        if (!transaction) {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // Idempotência: o Asaas reenvia o evento até receber 200.
        if (transaction.status === "PAID") {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // Confirma na API em vez de confiar no corpo do webhook.
        const remote = await getAsaasPayment(payment.id);
        if (!PAID_STATUSES.has(remote.status)) {
            console.warn(`Webhook anunciou pagamento, mas o Asaas reporta ${remote.status}.`);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // O status confirmado não diz QUANTO foi pago. Sem esta conferência, uma
        // cobrança de R$ 1,00 confirmada no gateway liberaria um presente de
        // R$ 2.500.
        //
        // O cuidado aqui é o parcelamento: `amountCharged` guarda o valor TOTAL,
        // mas numa compra parcelada o Asaas devolve o valor de UMA parcela — por
        // isso a comparação é contra `total / parcelas`. Transações anteriores à
        // coluna `installments` têm o campo nulo; nelas a conferência é pulada,
        // porque assumir 1 rejeitaria um parcelamento legítimo ainda pendente.
        if (transaction.installments !== null) {
            // Centavos: `remote.value` vem como número do JSON e `amountCharged`
            // é Decimal — comparar float direto erraria por arredondamento.
            const paidCents = Math.round(Number(remote.value) * 100);
            const chargedCents = Math.round(Number(transaction.amountCharged) * 100);
            const installments = Math.max(1, transaction.installments);
            const expectedCents = Math.round(chargedCents / installments);

            // O Asaas arredonda cada parcela, então a divisão não fecha exata
            // (R$ 1.031,32 em 10x dá 10 × R$ 103,13 = R$ 1.031,30). A folga de um
            // centavo por parcela cobre isso sem abrir espaço para pagar a menos.
            if (!Number.isFinite(paidCents) || paidCents < expectedCents - installments) {
                console.warn(`Webhook do pagamento ${transaction.id}: valor pago abaixo do cobrado.`);
                return NextResponse.json({ received: true }, { status: 200 });
            }
        }

        // `externalReference` é gravado por nós no checkout como o id do presente.
        // Divergir aqui significa que este pagamento é de outro item.
        if (remote.externalReference && remote.externalReference !== transaction.giftId) {
            console.warn(`Webhook do pagamento ${transaction.id}: externalReference divergente.`);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: "PAID" },
            }),
            prisma.gift.update({
                where: { id: transaction.giftId },
                data: { available: false },
            }),
        ]);

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error(
            "Erro ao processar o webhook do ASAAS:",
            error instanceof Error ? error.message : "erro desconhecido"
        );
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
