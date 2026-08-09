// src/actions/rsvp-actions.ts
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { RsvpSchema, UpdateRsvpSchema } from "@/lib/definitions";
import {
    checkRateLimit,
    enforceRateLimit,
    getClientIp,
    RateLimitError,
} from "@/lib/rate-limit";
import type { ActionResult } from "@/actions/gift-actions";

export interface RsvpResult extends ActionResult {
    /** `true` quando o telefone já tinha respondido e a resposta foi corrigida. */
    updated?: boolean;
}

/** P2002 = violação de índice único. Aqui, `(eventId, phone)`. */
function isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Confirmação de presença do convidado.
 *
 * Ação **pública e anônima** — de propósito não chama `verifySession()`: quem
 * confirma é convidado do casamento, não tem conta, e exigir cadastro mataria a
 * funcionalidade. O que protege este endereço é o rate limit por IP e o zod, do
 * mesmo jeito que a reserva da vitrine.
 *
 * Nada é logado com o objeto de erro neste caminho: ele carrega o telefone e o
 * nome de quem respondeu.
 */
export async function submitRsvp(formData: FormData): Promise<RsvpResult> {
    const ip = getClientIp(await headers());

    // `checkRateLimit` e não `enforceRateLimit`: a mensagem é para o convidado, e
    // Server Action que lança vira digest genérico em produção.
    const rate = await checkRateLimit({ key: `rsvp:${ip}`, limit: 10, windowSeconds: 10 * 60 });
    if (!rate.success) {
        return { success: false, message: "Muitas confirmações em pouco tempo." };
    }

    const parsed = RsvpSchema.safeParse({
        slug: formData.get("slug"),
        name: formData.get("name"),
        phone: formData.get("phone"),
        status: formData.get("status"),
        message: formData.get("message") ?? "",
        // Um campo por acompanhante, todos com o mesmo `name`.
        companions: formData.getAll("companion"),
    });

    if (!parsed.success) {
        // Só a mensagem: `issues` traz o valor recebido junto, e aqui esse valor
        // é o telefone e o nome de quem está confirmando.
        return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const { slug, name, phone, status, message, companions } = parsed.data;

    const event = await prisma.event.findUnique({
        where: { slug },
        select: { id: true },
    });

    if (!event) {
        return { success: false, message: "Convite não encontrado." };
    }

    const data = {
        name,
        status,
        message: message || null,
        companions,
    };

    // Só decide o texto da tela de sucesso. A garantia de não duplicar vem do
    // índice único `(eventId, phone)`, não desta consulta.
    const previous = await prisma.rsvp.findUnique({
        where: { eventId_phone: { eventId: event.id, phone } },
        select: { id: true },
    });

    try {
        // `upsert` sobre a chave única: o convidado que mudou de ideia corrige a
        // resposta em vez de criar uma segunda linha. Sem isso ele tentaria de
        // novo e receberia um erro sem saída.
        await prisma.rsvp.upsert({
            where: { eventId_phone: { eventId: event.id, phone } },
            create: { eventId: event.id, phone, ...data },
            update: data,
        });
    } catch (error) {
        // Duas abas enviando no mesmo instante: o `upsert` pode ler que a linha
        // não existe e perder a inserção para a outra requisição. O banco recusa
        // a segunda pelo índice único, e aqui ela vira o update que era para ser.
        if (isUniqueViolation(error)) {
            await prisma.rsvp.update({
                where: { eventId_phone: { eventId: event.id, phone } },
                data,
            });
        } else {
            throw error;
        }
    }

    // Só o painel muda. A página pública do convite não mostra confirmação
    // nenhuma — e não deve mesmo mostrar.
    revalidatePath("/admin");

    return { success: true, updated: previous !== null };
}

/**
 * Corrige uma confirmação pelo painel.
 *
 * Apagar e pedir para responder de novo só resolve o convidado que não era para
 * ter respondido. Nome digitado errado e acompanhante a mais ou a menos são o
 * caso comum, e o casal não tem como pedir ao convidado que refaça — é ele quem
 * conversa com a pessoa e sabe o certo.
 */
export async function updateRsvp(formData: FormData): Promise<ActionResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `rsvp:update:${session.userId}`,
            limit: 60,
            windowSeconds: 60 * 60,
            message: "Muitas alterações em pouco tempo.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const parsed = UpdateRsvpSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        phone: formData.get("phone"),
        status: formData.get("status"),
        message: formData.get("message") ?? "",
        companions: formData.getAll("companion"),
    });

    if (!parsed.success) {
        // Mesma regra do caminho público: `issues` traz o valor recebido junto,
        // e aqui esse valor é o telefone do convidado.
        return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const { id, name, phone, status, message, companions } = parsed.data;

    const existing = await prisma.rsvp.findUnique({
        where: { id },
        select: { id: true, event: { select: { userId: true } } },
    });

    // Mesma resposta para "não existe" e "não é seu".
    if (!existing || existing.event.userId !== session.userId) {
        return { success: false, message: "Confirmação não encontrada." };
    }

    try {
        await prisma.rsvp.update({
            where: { id },
            data: { name, phone, status, message: message || null, companions },
        });
    } catch (error) {
        // O telefone é a chave: corrigi-lo pode esbarrar em outra confirmação do
        // mesmo casamento. Juntar as duas linhas seria decisão do casal, não
        // nossa — então a mensagem diz o que houve e ele resolve.
        if (isUniqueViolation(error)) {
            return {
                success: false,
                message: "Já existe outra confirmação com esse telefone. Apague uma das duas.",
            };
        }
        throw error;
    }

    revalidatePath("/admin");

    return { success: true };
}

/**
 * Apaga uma confirmação. É o teste do primo, o convidado que ninguém convidou, e
 * o pedido de remoção de um acompanhante que não quis ter o nome na lista
 * (LGPD art. 18, VI).
 */
export async function deleteRsvp(id: string): Promise<ActionResult> {
    const session = await verifySession();

    const rsvp = await prisma.rsvp.findUnique({
        where: { id },
        select: { id: true, event: { select: { userId: true } } },
    });

    // Mesma resposta para "não existe" e "não é seu": não confirma a existência
    // de um id alheio.
    if (!rsvp || rsvp.event.userId !== session.userId) {
        return { success: false, message: "Confirmação não encontrada." };
    }

    await prisma.rsvp.delete({ where: { id } });

    revalidatePath("/admin");

    return { success: true };
}
