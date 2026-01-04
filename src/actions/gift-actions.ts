// src/actions/gift-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createGift(formData: FormData) {

    const title = formData.get("title") as string;
    const price = parseFloat(formData.get("price") as string);
    const imageUrl = formData.get("imageUrl") as string;
    const category = formData.get("category") as string;

    const event = await prisma.event.findUnique({
        where: { slug: "casamento-teste"},
    });

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
    await prisma.gift.delete({
        where: { id },
    });

    revalidatePath("/admin")
    revalidatePath("/")
}