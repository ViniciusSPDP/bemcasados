import { NextResponse } from "next/server";
import { z } from "zod"
import { prisma } from "@/lib/prisma";
import { createAsaasCharge, PaymentMethod } from "@/services/asaas";

//Validação dos dados recebidos
const CheckoutSchema = z.object({
    giftId: z.string().uuid(),
    guestName: z.string().min(3, "O nome muito curto"),
    guestEmail: z.string().email("E-mail inválido"),
    guestCPFCNPJ: z.string().min(11, "CPF/CNPJ inválido").transform(v => v.replace(/\D/g, "")),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
    message: z.string().max(500).optional(),
});

export async function POST(req: Request) {
    try{
        const body = await req.json();
        //Validação dos dados
        const data = CheckoutSchema.parse(body);
        //Busca o presente no banco
        const gift = await prisma.gift.findUnique({
            where: { id: data.giftId },
        });

        if(!gift){
            return NextResponse.json({ error: "Presente não encontrado." }, { status: 404 });
        }

        //Cria a cobrança no Asaas
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
        });

        //Salva o pedido no banco
        const transaction = await prisma.transaction.create({
            data: {
                giftId: gift.id,
                guestName: data.guestName,
                guestEmail: data.guestEmail,
                guestCPF: data.guestCPFCNPJ,
                message: data.message,

                //Valores
                amountOriginal: asaasResponse.financials.original,
                amountCharged: asaasResponse.financials.total,
                feeAmount: asaasResponse.financials.fee,

                //Dados do Asaas
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
            return NextResponse.json(
                { error: "Dados inválidos", details: error.issues },
                { status: 400 }
            );
        }


        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: "Erro desconhecido ao processar o checkout." },
            { status: 500 }
        );
    }
}