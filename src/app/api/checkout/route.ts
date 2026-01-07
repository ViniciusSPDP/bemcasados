// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { z } from "zod"
import { prisma } from "@/lib/prisma";
import { createAsaasCharge } from "@/services/asaas"; // Importe apenas o createCharge
import { PaymentMethod } from "@/lib/fees"; // Tipos vêm do lib/fees

const CheckoutSchema = z.object({
    giftId: z.string().uuid(),
    guestName: z.string().min(3, "O nome muito curto"),
    guestEmail: z.string().email("E-mail inválido"),
    guestCPFCNPJ: z.string().min(11, "CPF/CNPJ inválido").transform(v => v.replace(/\D/g, "")),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
    message: z.string().max(500).optional(),
    installments: z.coerce.number().int().min(1).max(12).default(1), // Limitado a 12 por padrão
});

export async function POST(req: Request) {
    try{
        const body = await req.json();
        const data = CheckoutSchema.parse(body);

        // Validação extra: PIX não parcela
        if (data.paymentMethod === "PIX" && data.installments > 1) {
             return NextResponse.json({ error: "Pix não permite parcelamento." }, { status: 400 });
        }

        const gift = await prisma.gift.findUnique({
            where: { id: data.giftId },
        });

        if(!gift){
            return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });
        }

        const giftPrice = Number(gift.price);
        
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
                guestCPF: data.guestCPFCNPJ,
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
        console.error("Erro no checkout:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Erro interno ao processar pagamento." }, { status: 500 });
    }
}