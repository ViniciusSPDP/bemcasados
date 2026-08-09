// src/actions/account-actions.ts
"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { UpdateProfileSchema, ChangePasswordSchema } from "@/lib/definitions";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import type { ActionResult } from "@/actions/gift-actions";

/**
 * Dados de acesso do casal.
 *
 * As duas ações aqui exigem a **senha atual**, mesmo com a sessão já validada.
 * `verifySession()` prova que existe um JWT válido, não que quem está do outro
 * lado é o dono da conta — uma sessão esquecida aberta num computador viraria
 * uma tomada de conta silenciosa: trocar o e-mail e a senha basta para o dono
 * legítimo perder o acesso.
 */

/** Mesmo custo usado no cadastro (`src/auth.ts`). */
const BCRYPT_COST = 12;

export async function updateProfile(formData: FormData): Promise<ActionResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `profile:update:${session.userId}`,
            limit: 10,
            windowSeconds: 60 * 60,
            message: "Muitas alterações em pouco tempo.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const parsed = UpdateProfileSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        currentPassword: formData.get("currentPassword"),
    });

    if (!parsed.success) {
        // Sem ecoar `issues` inteiro: ele carrega o valor recebido, e aqui um
        // dos campos é a senha.
        return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, password: true },
    });

    if (!user) return { success: false, message: "Conta não encontrada." };

    if (!(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
        return { success: false, message: "Senha atual incorreta." };
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { name: parsed.data.name, email: parsed.data.email },
        });
    } catch (error) {
        // P2002 = violação do índice único de `email`.
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return { success: false, message: "Este e-mail já está em uso." };
        }
        throw error;
    }

    revalidatePath("/admin");
    return { success: true };
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `password:change:${session.userId}`,
            limit: 5,
            windowSeconds: 60 * 60,
            message: "Muitas tentativas de troca de senha.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const parsed = ChangePasswordSchema.safeParse({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, password: true },
    });

    if (!user) return { success: false, message: "Conta não encontrada." };

    if (!(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
        return { success: false, message: "Senha atual incorreta." };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST) },
    });

    // A sessão é um JWT com o id do usuário, então continua válida — trocar a
    // senha não desconecta este navegador nem os outros. Fechar as demais
    // sessões exigiria versionar o token, e fica registrado como pendência.
    return { success: true };
}
