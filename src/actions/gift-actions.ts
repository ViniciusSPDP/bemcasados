// src/actions/gift-actions.ts
"use server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from "@/lib/s3";
import { revalidatePath } from "next/cache";
import { isAsaasAccountApproved } from "@/services/asaas";

export async function createGift(formData: FormData) {
    console.log("=== DEBUG: INICIANDO CRIAÇÃO DE PRESENTE ===");
    const session = await verifySession();

    // 1. Buscar o evento
    const event = await prisma.event.findFirst({
        where: { userId: session.userId }
    });

    if (!event) {
        console.error("DEBUG: Evento não encontrado para o usuário", session.userId);
        throw new Error("Evento não encontrado");
    }

    // 2. Trava de Segurança
    if (!event.asaasApiKey) {
        throw new Error("Você precisa configurar sua carteira antes de criar presentes.");
    }

    const isApproved = await isAsaasAccountApproved(event.asaasApiKey);
    if (!isApproved) {
        throw new Error("Criação Bloqueada: Sua conta no Asaas ainda não foi aprovada.");
    }

    // 3. Processamento dos dados
    const title = formData.get("title") as string;
    const priceStr = formData.get("price") as string;
    const price = parseFloat(priceStr.replace(',', '.'));
    const category = formData.get("category") as string;
    const isExclusive = formData.has("isExclusive");

    console.log("DEBUG: Dados recebidos - Título:", title, "| Preço:", price);

    // 4. Tratamento da Imagem com Debug
    const imageFile = formData.get("image") as File | null;
    let imageUrl = "";

    console.log("DEBUG: imageFile capturado:", {
        nome: imageFile?.name,
        tamanho: imageFile?.size,
        tipo: imageFile?.type
    });

    if (imageFile && imageFile.size > 0 && imageFile.name !== 'undefined') {
        try {
            console.log("DEBUG: Iniciando chamada para uploadFileToS3...");
            imageUrl = await uploadFileToS3(imageFile);
            console.log("DEBUG: URL retornada pelo S3:", imageUrl);
            
            if (!imageUrl) {
                console.warn("DEBUG: uploadFileToS3 retornou vazio, usando placeholder.");
                imageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(title)}`;
            }
        } catch (error) {
            console.error("DEBUG: Erro Crítico durante o upload no S3:", error);
            imageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(title)}`;
        }
    } else {
        console.warn("DEBUG: Nenhum arquivo de imagem válido detectado no FormData. Usando placeholder.");
        imageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(title)}`;
    }

    // 5. Criação no Banco de Dados
    try {
        console.log("DEBUG: Gravando no Prisma com URL:", imageUrl);
        const newGift = await prisma.gift.create({
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
        console.log("DEBUG: Presente criado com sucesso no banco ID:", newGift.id);
    } catch (dbError) {
        console.error("DEBUG: Erro ao salvar no Prisma:", dbError);
        throw new Error("Erro ao salvar o presente no banco de dados.");
    }

    // 6. Revalidação de Cache
    console.log("DEBUG: Revalidando caminhos...");
    revalidatePath("/admin");
    revalidatePath(`/${event.slug}`);
    revalidatePath(`/${event.slug}/presentes`);
    
    console.log("=== DEBUG: FIM DO PROCESSO ===");
    return { success: true };
}

export async function deleteGift(id: string) {
    const session = await verifySession(); //

    // 1. Verificar se o presente existe e pertence ao usuário
    const gift = await prisma.gift.findUnique({
        where: { id },
        include: { event: true },
    });

    if (!gift || gift.event.userId !== session.userId) {
        throw new Error("Não autorizado ou presente não encontrado.");
    }

    // 2. Executar o Soft Delete (Apenas marca o campo deletedAt)
    await prisma.gift.update({
        where: { id },
        data: { 
            deletedAt: new Date() 
        },
    });

    // 3. Revalidar os caminhos para atualizar a UI
    revalidatePath("/admin");
    revalidatePath(`/${gift.event.slug}`);
    revalidatePath(`/${gift.event.slug}/presentes`);
    
}