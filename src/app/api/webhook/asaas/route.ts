// src/app/api/webhook/asaas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const authToken = req.headers.get("asaas-access-token");

    // 1. Validação de segurança
    if (authToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.error("[Webhook] Token inválido recebido.");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment } = body;

    console.log(
      `🪝 [Asaas] Evento: ${event} | Pagamento: ${payment.id} | Valor: ${payment.value}`,
    );

    // 2. Processar Confirmação de Pagamento
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const asaasId = payment.id;

      // Buscamos a transação incluindo os dados do presente para saber o slug do evento
      const transaction = await prisma.transaction.findUnique({
        where: { asaasId },
        include: {
          gift: {
            include: { event: true },
          },
        },
      });

      if (transaction) {
        if (transaction.status === "PAID") {
          return NextResponse.json(
            { message: "Already processed" },
            { status: 200 },
          );
        }

        await prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: "PAID", updatedAt: new Date() },
          });

          // LÓGICA INTELIGENTE:
          // Só marca como indisponível se o campo 'isExclusive' for true
          if (transaction.gift.isExclusive) {
            await tx.gift.update({
              where: { id: transaction.giftId },
              data: {
                available: false,
                updatedAt: new Date(),
              },
            });
            console.log(
              `🎁 Presente exclusivo [${transaction.gift.title}] agora está indisponível.`,
            );
          } else {
            console.log(
              `💰 Cota recebida para [${transaction.gift.title}]. Continua disponível.`,
            );
          }
        });

        revalidatePath("/admin");
        revalidatePath(`/${transaction.gift.event.slug}`);

        console.log(`✅ Transação ${transaction.id} confirmada e cache limpo!`);
      } else {
        console.warn(
          `⚠️ Transação não encontrada no banco para o ID Asaas: ${asaasId}`,
        );
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Erro ao processar o webhook do ASAAS:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
