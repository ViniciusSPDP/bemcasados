//src/app/api/webhook/asaas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const authToken = req.headers.get("asaas-access-token");
        if (authToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { event, payment } = body;

        console.log(`🪝 Webhook recebido: ${event} - ID: ${payment.id}`);

        if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {

            const asaasId = payment.id;

            const transaction = await prisma.transaction.findUnique({
                where: { asaasId },
            });

            if (transaction){
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: "PAID",
                        updatedAt: new Date(),
                    },
                });

                await prisma.gift.update({
                    where: { id: transaction.giftId },
                    data: {
                        available: false,
                        updatedAt: new Date(),
                    },
                })
                console.log(`✅ Transação ${transaction.id} atualizada para PAID!`);
            }else{
                console.warn(`⚠️ Transação não encontrada para o pagamento ${asaasId}`);
            }
        }
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error) {
        console.error("Erro ao processar o webhook do ASAAS:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}