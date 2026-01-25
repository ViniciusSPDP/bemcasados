// src/actions/gift-actions.ts
"use server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from "@/lib/s3";
import { revalidatePath } from "next/cache";
import { isAsaasAccountApproved } from "@/services/asaas";

export async function createGift(formData: FormData) {
    const session = await verifySession();

    // 1. Buscar o evento para obter a API Key do Asaas
    const event = await prisma.event.findFirst({
        where: { userId: session.userId }
    });

    if (!event) {
        throw new Error("Evento não encontrado");
    }

    // 2. Trava de Segurança: Verificar aprovação no Asaas
    // Se não tiver API Key ou não estiver aprovado, bloqueia a criação
    if (!event.asaasApiKey) {
        throw new Error("Você precisa configurar sua carteira antes de criar presentes.");
    }

    const isApproved = await isAsaasAccountApproved(event.asaasApiKey);

    if (!isApproved) {
        throw new Error("Criação Bloqueada: Sua conta no Asaas ainda não foi aprovada. Por favor, complete a validação na aba 'Conta e Saques'.");
    }

    // 3. Processamento dos dados do formulário
    const title = formData.get("title") as string;
    const price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;
    
    // O checkbox envia "on" se marcado, ou null se desmarcado.
    const isExclusive = formData.get("isExclusive") === "on";

    const imageFile = formData.get("image") as File;
    let imageUrl = "";

    // 4. Upload de Imagem (apenas se a conta estiver ok)
    if (imageFile && imageFile.size > 0) {
        try {
            imageUrl = await uploadFileToS3(imageFile);
        } catch (error) {
            console.error("Erro ao fazer upload da imagem para o S3:", error);
            throw new Error("Erro ao fazer upload da imagem");
        }
    } else {
        imageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(title)}`;
    }

    // 5. Criação no Banco de Dados
    await prisma.gift.create({
        data: {
            title,
            price,
            imageUrl,
            category,
            isExclusive,
            eventId: event.id,
            available: true,
        },
    });

    // 6. Revalidação de Cache
    revalidatePath("/admin");
    revalidatePath(`/${event.slug}`);
    
    return { success: true };
}

export async function deleteGift(id: string) {
    const session = await verifySession();

    const gift = await prisma.gift.findUnique({
        where: { id },
        include: { event: true },
    });

    if (gift && gift.event.userId === session.userId) {
        await prisma.gift.delete({
            where: { id },
        });
        revalidatePath("/admin");
        revalidatePath(`/${gift.event.slug}`);
    } else {
        throw new Error("Não autorizado.");
    }
}