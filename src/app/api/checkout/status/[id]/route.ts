// src/app/api/checkout/status/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Consulta o status de uma transação específica para o Polling do Modal.
 * Este endpoint é chamado repetidamente pelo frontend até que o status seja 'PAID'.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // Tipagem como Promise para compatibilidade com Next.js 15+
) {
    try {
        // Aguarda a resolução dos parâmetros da URL
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "ID da transação é obrigatório" }, 
                { status: 400 }
            );
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            select: { 
                status: true 
            }
        });

        if (!transaction) {
            return NextResponse.json(
                { error: "Transação não encontrada" }, 
                { status: 404 }
            );
        }

        // Retorna apenas o status para minimizar o tráfego de dados no polling
        return NextResponse.json({ status: transaction.status });

    } catch (error: unknown) {
        console.error("Erro ao consultar status da transação:", error);
        
        return NextResponse.json(
            { error: "Erro interno ao consultar status" }, 
            { status: 500 }
        );
    }
}