// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAsaasCharge } from "@/services/asaas";
import { PaymentMethod } from "@/lib/fees";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { maskDocument, isValidCpfCnpj } from "@/lib/documents";

const CheckoutSchema = z.object({
    giftId: z.string().uuid(),
    guestName: z.string().trim().min(3, "Nome muito curto").max(120),
    guestEmail: z.string().trim().email("E-mail inválido").max(254),
    guestCPFCNPJ: z
        .string()
        .transform((v) => v.replace(/\D/g, ""))
        .refine(isValidCpfCnpj, "CPF/CNPJ inválido"),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
    message: z.string().trim().max(500).optional(),
    installments: z.coerce.number().int().min(1).max(12).default(1),
});

export async function POST(req: Request) {
    // Endpoint público que cria cobrança real no gateway. Sem limite, um script
    // gera cobranças ilimitadas na conta do Asaas e enche a tabela de transações.
    const ip = getClientIp(req.headers);
    const rate = await checkRateLimit({
        key: `checkout:${ip}`,
        limit: 5,
        windowSeconds: 10 * 60,
    });

    if (!rate.success) {
        return NextResponse.json(
            { error: "Muitas tentativas de pagamento. Aguarde alguns minutos." },
            { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
        );
    }

    try {
        const body = await req.json();
        const parsed = CheckoutSchema.safeParse(body);

        if (!parsed.success) {
            // Sem `error.issues`: o zod devolve o valor recebido junto do erro,
            // o que ecoaria o CPF e o e-mail do convidado de volta na resposta.
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
                { status: 400 }
            );
        }

        const data = parsed.data;

        // PIX é à vista; cartão e boleto aceitam parcelamento (até 6x no boleto,
        // 12x no cartão, espelhando o que o formulário oferece).
        const maxInstallments = data.paymentMethod === "PIX" ? 1 : data.paymentMethod === "BOLETO" ? 6 : 12;

        if (data.installments > maxInstallments) {
            return NextResponse.json(
                { error: "Número de parcelas indisponível para esta forma de pagamento." },
                { status: 400 }
            );
        }

        const gift = await prisma.gift.findUnique({
            where: { id: data.giftId },
            include: { event: { select: { id: true } } },
        });

        if (!gift || !gift.event) {
            return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });
        }

        // Faltava esta checagem: um presente já pago continuava comprável.
        // Cobranças pendentes não bloqueiam o presente de propósito — quem
        // desiste do PIX não pode deixar o item travado para os outros.
        if (!gift.available) {
            return NextResponse.json(
                { error: "Este presente já foi escolhido por outro convidado." },
                { status: 409 }
            );
        }

        const giftPrice = Number(gift.price);
        if (!Number.isFinite(giftPrice) || giftPrice <= 0) {
            console.error(`Presente ${gift.id} com preço inválido`);
            return NextResponse.json({ error: "Presente indisponível." }, { status: 409 });
        }

        const asaasResponse = await createAsaasCharge({
            customer: {
                name: data.guestName,
                cpfCnpj: data.guestCPFCNPJ,
                email: data.guestEmail,
            },
            value: giftPrice,
            method: data.paymentMethod as PaymentMethod,
            description: `Compra do presente: ${gift.title}`,
            externalReference: gift.id,
            installmentCount: data.installments,
        });

        const transaction = await prisma.transaction.create({
            data: {
                giftId: gift.id,
                guestName: data.guestName,
                guestEmail: data.guestEmail,
                // Só a máscara é persistida; o documento completo fica no Asaas.
                guestCPFMasked: maskDocument(data.guestCPFCNPJ),
                message: data.message,

                amountOriginal: asaasResponse.financials.original,
                amountCharged: asaasResponse.financials.total,
                feeAmount: asaasResponse.financials.fee,

                asaasId: asaasResponse.paymentId,
                paymentLink: asaasResponse.invoiceUrl,
                paymentMethod: data.paymentMethod,
                status: "PENDING",
            },
        });

        return NextResponse.json({
            success: true,
            paymentUrl: asaasResponse.invoiceUrl,
            pixQrCode: asaasResponse.pixQrCode,
            transactionId: transaction.id,
        });
    } catch (error) {
        // Sem despejar o objeto inteiro: ele carrega o corpo da requisição, com
        // nome, e-mail e CPF do convidado, para o log do container.
        console.error(
            "Erro no checkout:",
            error instanceof Error ? error.message : "erro desconhecido"
        );
        return NextResponse.json({ error: "Erro interno ao processar pagamento." }, { status: 500 });
    }
}
