// src/actions/gift-actions.ts
"use server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3, UploadValidationError } from "@/lib/s3";
import { CreateGiftSchema } from "@/lib/definitions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export interface ActionResult {
    success: boolean;
    message?: string;
}

/**
 * Erros de validação são **retornados**, não lançados: em produção o Next
 * substitui a mensagem de uma exceção de Server Action por um digest genérico,
 * e o casal veria "erro inesperado" no lugar de "arquivo maior que 5MB".
 */
export async function createGift(formData: FormData): Promise<ActionResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `gift:create:${session.userId}`,
            limit: 30,
            windowSeconds: 60 * 60,
            message: "Muitos presentes criados em pouco tempo. Tente novamente mais tarde.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const parsed = CreateGiftSchema.safeParse({
        title: formData.get("title"),
        price: formData.get("price"),
        category: formData.get("category"),
    });

    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const { title, price, category } = parsed.data;

    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        select: { id: true },
    });

    if (!event) {
        return { success: false, message: "Evento não encontrado." };
    }

    // O upload só acontece depois da validação e da checagem de posse — assim um
    // payload inválido não consome storage.
    const imageFile = formData.get("image");
    let imageKey: string | null = null;

    if (imageFile instanceof File && imageFile.size > 0) {
        try {
            imageKey = await uploadFileToS3(imageFile);
        } catch (error) {
            if (error instanceof UploadValidationError) {
                return { success: false, message: error.message };
            }
            console.error("Falha no upload da imagem do presente");
            return { success: false, message: "Não foi possível enviar a imagem." };
        }
    }

    await prisma.gift.create({
        data: {
            title,
            price,
            imageUrl: imageKey,
            category,
            eventId: event.id,
            available: true,
        },
    });

    revalidatePath("/admin");
    revalidatePath("/");

    return { success: true };
}

export async function deleteGift(id: string) {
    const session = await verifySession();

    const gift = await prisma.gift.findUnique({
        where: { id },
        include: { event: { select: { userId: true, slug: true } } },
    });

    if (!gift || gift.event.userId !== session.userId) {
        throw new Error("Não autorizado.");
    }

    await prisma.gift.delete({ where: { id } });

    revalidatePath("/admin");
    revalidatePath(`/${gift.event.slug}`);
}
