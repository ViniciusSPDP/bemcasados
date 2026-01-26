// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAsaasCharge, getPixQrCode, getBoletoCode } from "@/services/asaas";
import { PaymentMethod } from "@/lib/fees";

// Schema validando os campos necessários para Cartão White Label
const CheckoutSchema = z.object({
    giftId: z.string().uuid(),
    guestName: z.string().min(3, "O nome muito curto"),
    guestEmail: z.string().email("E-mail inválido"),
    guestCPFCNPJ: z.string().min(11, "CPF/CNPJ inválido").transform(v => v.replace(/\D/g, "")),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
    message: z.string().max(500).optional(),
    installments: z.coerce.number().int().min(1).max(12).default(1),
    // Dados do cartão (opcionais, usados apenas em CREDIT_CARD)
    creditCard: z.object({
        holderName: z.string(),
        number: z.string(),
        expiryMonth: z.string(),
        expiryYear: z.string(),
        ccv: z.string()
    }).optional()
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = CheckoutSchema.parse(body);

        // Captura o IP do cliente (exigido pelo Asaas para transações de cartão)
        const remoteIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

        if (data.paymentMethod === "PIX" && data.installments > 1) {
             return NextResponse.json({ error: "Pix não permite parcelamento." }, { status: 400 });
        }

        // 1. Busca presente e evento (credenciais da subconta)
        const gift = await prisma.gift.findUnique({
            where: { id: data.giftId },
            include: { event: true }
        });

        if (!gift || !gift.event) {
            return NextResponse.json({ error: "Presente ou evento não encontrado." }, { status: 404 });
        }

        if (!gift.event.walletId || !gift.event.asaasApiKey) {
            return NextResponse.json({ error: "Configuração de recebimento incompleta." }, { status: 400 });
        }

        // 2. Chamada ao Asaas para criar a cobrança
        // PASSAMOS O SLUG vindo do banco de dados (gift.event.slug)
        const asaasResponse = await createAsaasCharge({
            customer: {
                name: data.guestName,
                cpfCnpj: data.guestCPFCNPJ,
                email: data.guestEmail,
            },
            value: Number(gift.price),
            method: data.paymentMethod as PaymentMethod,
            description: `Presente para ${gift.event.coupleName}: ${gift.title}`,
            externalReference: gift.id,
            installmentCount: data.installments,
            subAccountApiKey: gift.event.asaasApiKey,
            remoteIp,
            slug: gift.event.slug, // <--- CORREÇÃO: Passando o slug obrigatório
            // Só envia se for cartão
            ...(data.paymentMethod === "CREDIT_CARD" && data.creditCard && {
                creditCard: data.creditCard,
                creditCardHolderInfo: {
                    name: data.guestName,
                    email: data.guestEmail,
                    cpfCnpj: data.guestCPFCNPJ,
                    postalCode: "01310100", // CEP genérico
                    addressNumber: "SN",
                    mobilePhone: "11999999999"
                }
            })
        });

        // 3. Salva a transação no banco de dados local
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
                status: asaasResponse.status === "CONFIRMED" ? "PAID" : "PENDING",
            },
        });

        // --- LÓGICA WHITE LABEL ---
        let extraInfo = null;

        if (data.paymentMethod === "PIX") {
            extraInfo = await getPixQrCode(asaasResponse.paymentId, gift.event.asaasApiKey);
        } else if (data.paymentMethod === "BOLETO") {
            const barCode = await getBoletoCode(asaasResponse.paymentId, gift.event.asaasApiKey);
            extraInfo = { barCode, pdfUrl: asaasResponse.invoiceUrl };
        }

        // 4. Retorno unificado
        return NextResponse.json({
            success: true,
            transactionId: transaction.id,
            paymentMethod: data.paymentMethod,
            status: transaction.status,
            paymentUrl: asaasResponse.invoiceUrl,
            pix: data.paymentMethod === "PIX" ? extraInfo : null,
            boleto: data.paymentMethod === "BOLETO" ? extraInfo : null,
        });

    } catch (error: unknown) { 
        console.error("Erro no checkout:", error);
        const errorMessage = error instanceof Error ? error.message : "Erro interno ao processar pagamento.";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}