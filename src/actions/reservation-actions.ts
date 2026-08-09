// src/actions/reservation-actions.ts
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ReserveExternalGiftSchema } from "@/lib/definitions";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { ActionResult } from "@/actions/gift-actions";

/**
 * Reserva de um presente da vitrine.
 *
 * Ação **pública e anônima** — de propósito não chama `verifySession()`: quem
 * reserva é convidado do casamento, não tem conta, e exigir login mataria a
 * funcionalidade. O que protege este endereço é o rate limit por IP e a
 * validação por zod, do mesmo jeito que em `/api/checkout`.
 */
export async function reserveExternalGift(formData: FormData): Promise<ActionResult> {
    const ip = getClientIp(await headers());

    // `checkRateLimit` e não `enforceRateLimit`: a mensagem é para o convidado, e
    // Server Action que lança vira digest genérico em produção.
    const rate = await checkRateLimit({ key: `reserve:${ip}`, limit: 8, windowSeconds: 10 * 60 });
    if (!rate.success) {
        return {
            success: false,
            message: "Muitas reservas em pouco tempo.",
        };
    }

    const parsed = ReserveExternalGiftSchema.safeParse({
        giftId: formData.get("giftId"),
        name: formData.get("name"),
        phone: formData.get("phone"),
        message: formData.get("message") ?? "",
    });

    if (!parsed.success) {
        // Só a mensagem: `issues` traz o valor recebido junto, e aqui esse valor
        // é o telefone do convidado.
        return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const { giftId, name, phone, message } = parsed.data;

    const gift = await prisma.externalGift.findUnique({
        where: { id: giftId },
        select: { id: true, event: { select: { slug: true } } },
    });

    if (!gift) {
        return { success: false, message: "Presente não encontrado." };
    }

    // A corrida: dois convidados podem submeter no mesmo segundo. Um `findUnique`
    // seguido de `update` deixaria o segundo sobrescrever a reserva do primeiro.
    // Este `updateMany` vira um único `UPDATE ... WHERE id = $1 AND reservedAt IS
    // NULL` — o banco garante que só uma transação encontra a linha ainda livre,
    // e o `count` diz quem ganhou.
    const result = await prisma.externalGift.updateMany({
        where: { id: giftId, reservedAt: null },
        data: {
            reservedAt: new Date(),
            reservedName: name,
            reservedPhone: phone, // só dígitos: o schema já normalizou
            reservedMessage: message || null,
        },
    });

    if (result.count === 0) {
        return {
            success: false,
            message: "Este presente acabou de ser reservado por outro convidado. Escolha outro 🙂",
        };
    }

    revalidatePath(`/${gift.event.slug}/vitrine`);
    revalidatePath("/admin");

    return { success: true };
}
