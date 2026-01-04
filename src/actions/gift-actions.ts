// src/actions/gift-actions.ts
"use server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from "@/lib/s3";
import { revalidatePath } from "next/cache";

export async function createGift(formData: FormData) {

    const session = await verifySession()


    const title = formData.get("title") as string;
    const price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;

    const imageFile = formData.get("image") as File;
    let imageUrl = "";

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

    const event = await prisma.event.findFirst({
        where: {
            userId: session.userId
        }
    })

    if (!event) {
        throw new Error("Evento não encontrado");
    }

    await prisma.gift.create({
        data: {
            title,
            price,
            imageUrl,
            category,
            eventId: event.id,
            available: true,
        },
    });

    revalidatePath("/admin")
    revalidatePath("/")
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
        revalidatePath("/admin")
    } else {
        throw new Error("Não autorizado.");
    }

}