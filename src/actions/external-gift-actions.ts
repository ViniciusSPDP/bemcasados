// src/actions/external-gift-actions.ts
"use server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3, UploadValidationError } from "@/lib/s3";
import {
    CreateExternalGiftSchema,
    ExternalGiftColorSchema,
    ExternalGiftUrlSchema,
    MAX_EXTERNAL_GIFTS,
    MAX_IMPORT_ROWS,
} from "@/lib/definitions";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { extractMlbId } from "@/lib/ml-link";
import { parseCsv, readSheet } from "@/lib/csv";
import { fetchProductDraft, downloadImage, ExternalFetchError } from "@/services/mercadolivre";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/gift-actions";

/**
 * Gerência da vitrine pelo painel do casal.
 *
 * Como no resto do projeto, erro de validação é **retornado** e não lançado: em
 * produção o Next troca a mensagem de uma exceção por um digest genérico.
 */

export interface ProductDraftResult extends ActionResult {
    draft?: {
        title: string | null;
        description: string | null;
        imageSourceUrl: string | null;
    };
}

/**
 * Botão "Tentar buscar dados". Vive numa action separada de propósito: assim o
 * cadastro não tem nenhuma dependência de rede e continua funcionando quando o
 * Mercado Livre recusa a leitura — o que acontece com link de página de produto
 * (anti-bot) e pode voltar a acontecer com qualquer formato a qualquer momento.
 */
export async function previewExternalGift(formData: FormData): Promise<ProductDraftResult> {
    const session = await verifySession();

    // Esta é a superfície de SSRF do projeto: o limite por usuário é o controle
    // certo, porque quem chega aqui está autenticado.
    try {
        await enforceRateLimit({
            key: `ml:preview:${session.userId}`,
            limit: 20,
            windowSeconds: 10 * 60,
            message: "Muitas consultas em pouco tempo.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const parsed = ExternalGiftUrlSchema.safeParse(formData.get("shortUrl"));
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0]?.message ?? "Link inválido" };
    }

    const draft = await fetchProductDraft(parsed.data);

    if (!draft.title && !draft.imageSourceUrl) {
        return {
            success: false,
            message:
                "Não conseguimos ler este anúncio automaticamente. Com o link curto (meli.la) costuma " +
                "funcionar; se você colou o endereço completo do produto, tente o link de compartilhar. " +
                "Ou preencha o título e envie a foto abaixo.",
        };
    }

    return {
        success: true,
        draft: {
            title: draft.title,
            description: draft.description,
            imageSourceUrl: draft.imageSourceUrl,
        },
    };
}

export async function createExternalGift(formData: FormData): Promise<ActionResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `external-gift:create:${session.userId}`,
            limit: 40,
            windowSeconds: 60 * 60,
            message: "Muitos presentes criados em pouco tempo.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const parsed = CreateExternalGiftSchema.safeParse({
        shortUrl: formData.get("shortUrl"),
        title: formData.get("title"),
        description: formData.get("description") ?? "",
        imageSourceUrl: formData.get("imageSourceUrl") ?? "",
        colorTag: formData.get("colorTag") ?? "",
    });

    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const { shortUrl, title, description, imageSourceUrl, colorTag } = parsed.data;

    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        select: { id: true, slug: true },
    });

    if (!event) {
        return { success: false, message: "Evento não encontrado." };
    }

    const total = await prisma.externalGift.count({ where: { eventId: event.id } });
    if (total >= MAX_EXTERNAL_GIFTS) {
        return {
            success: false,
            message: `A vitrine já tem ${MAX_EXTERNAL_GIFTS} itens. Remova algum antes de adicionar outro.`,
        };
    }

    // A imagem só é resolvida depois da validação e da checagem de posse, para
    // um payload inválido não consumir storage.
    const imageFile = formData.get("image");
    let imageKey: string | null = null;

    try {
        if (imageFile instanceof File && imageFile.size > 0) {
            // O arquivo enviado vence a URL: é o caminho principal, e é o que
            // funciona no celular.
            imageKey = await uploadFileToS3(imageFile);
        } else if (imageSourceUrl) {
            imageKey = await uploadFileToS3(await downloadImage(imageSourceUrl));
        }
    } catch (error) {
        if (error instanceof UploadValidationError || error instanceof ExternalFetchError) {
            return { success: false, message: error.message };
        }
        console.error("Falha ao preparar a imagem do presente da vitrine");
        return { success: false, message: "Não foi possível enviar a imagem." };
    }

    try {
        await prisma.externalGift.create({
            data: {
                eventId: event.id,
                title,
                description: description || null,
                imageUrl: imageKey,
                // Guardado exatamente como o casal colou: é este endereço que
                // carrega o código de afiliado.
                shortUrl,
                externalId: extractMlbId(shortUrl),
                colorTag: colorTag || null,
            },
        });
    } catch (error) {
        // P2002 = violação do índice único (eventId, externalId).
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return { success: false, message: "Este produto já está na sua vitrine." };
        }
        throw error;
    }

    revalidatePath("/admin");
    revalidatePath(`/${event.slug}`);
    revalidatePath(`/${event.slug}/vitrine`);

    return { success: true };
}

export type ImportRowStatus = "importado" | "sem-dados" | "invalido" | "duplicado" | "erro";

export interface ImportRowResult {
    /** Linha da planilha, como o casal vê ao abri-la. */
    line: number;
    link: string;
    status: ImportRowStatus;
    message: string;
}

export interface ImportResult extends ActionResult {
    imported?: number;
    rows?: ImportRowResult[];
}

/**
 * Importa vários itens de uma vez a partir de uma planilha.
 *
 * O que o Mercado Livre não devolver **não vira erro fatal**: o item é criado
 * com o que a planilha tiver (ou com o título que o casal escreveu lá), e o
 * relatório aponta a linha para ele completar depois. Um anúncio expirado ou
 * removido é o caso mais comum, e não pode derrubar a importação inteira.
 */
export async function importExternalGifts(formData: FormData): Promise<ImportResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `external-gift:import:${session.userId}`,
            // 6 era apertado demais na prática: encher a vitrine já consome 4
            // importações, e qualquer erro de planilha travava o casal por uma
            // hora. Com 20, ainda há teto contra abuso, e o que de fato protege
            // o Mercado Livre continua sendo o lote de 15 processado em série.
            limit: 20,
            windowSeconds: 60 * 60,
            message: "Muitas importações em pouco tempo.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    // A planilha pode chegar como arquivo ou colada num campo de texto.
    let content = String(formData.get("csvText") ?? "");
    const file = formData.get("csvFile");

    if (file instanceof File && file.size > 0) {
        if (file.size > 512 * 1024) {
            return { success: false, message: "Arquivo grande demais para uma planilha de links." };
        }
        content = await file.text();
    }

    if (!content.trim()) {
        return { success: false, message: "Envie a planilha ou cole os links." };
    }

    const sheet = readSheet(parseCsv(content));

    if (sheet.length === 0) {
        return {
            success: false,
            message: "Não encontrei nenhum link na planilha. A coluna deve se chamar 'link'.",
        };
    }

    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        select: { id: true, slug: true },
    });

    if (!event) return { success: false, message: "Evento não encontrado." };

    const existing = await prisma.externalGift.count({ where: { eventId: event.id } });
    const room = MAX_EXTERNAL_GIFTS - existing;

    if (room <= 0) {
        return { success: false, message: `A vitrine já está no limite de ${MAX_EXTERNAL_GIFTS} itens.` };
    }

    const rows: ImportRowResult[] = [];
    const batch = sheet.slice(0, Math.min(MAX_IMPORT_ROWS, room));

    // Sequencial, e não em paralelo: disparar 15 requisições de uma vez ao
    // Mercado Livre é o caminho mais curto para tomar bloqueio por robô — foi o
    // que aconteceu quando medimos o comportamento deles.
    for (const row of batch) {
        const parsedUrl = ExternalGiftUrlSchema.safeParse(row.link);

        if (!parsedUrl.success) {
            rows.push({
                line: row.line,
                link: row.link,
                status: "invalido",
                message: parsedUrl.error.issues[0]?.message ?? "Link inválido",
            });
            continue;
        }

        const shortUrl = parsedUrl.data;

        try {
            const draft = await fetchProductDraft(shortUrl);
            const title = row.title || draft.title;

            if (!title) {
                // Sem título nem da planilha nem do anúncio, não há o que mostrar
                // ao convidado. É o caso do anúncio expirado ou removido.
                rows.push({
                    line: row.line,
                    link: row.link,
                    status: "sem-dados",
                    message:
                        "Não encontrado no Mercado Livre (o anúncio pode ter expirado). " +
                        "Escreva um título na planilha ou cadastre este item à mão.",
                });
                continue;
            }

            let imageKey: string | null = null;
            if (draft.imageSourceUrl) {
                try {
                    imageKey = await uploadFileToS3(await downloadImage(draft.imageSourceUrl));
                } catch {
                    // Imagem é o menos importante: o item entra sem foto e o casal
                    // acrescenta depois.
                    imageKey = null;
                }
            }

            await prisma.externalGift.create({
                data: {
                    eventId: event.id,
                    title: title.slice(0, 140),
                    description: (row.description || draft.description || "").slice(0, 1000) || null,
                    imageUrl: imageKey,
                    shortUrl,
                    externalId: extractMlbId(shortUrl) ?? draft.externalId,
                },
            });

            rows.push({
                line: row.line,
                link: row.link,
                status: "importado",
                message: imageKey ? title : `${title} — sem foto, acrescente depois`,
            });
        } catch (error) {
            if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
                rows.push({
                    line: row.line,
                    link: row.link,
                    status: "duplicado",
                    message: "Este produto já está na vitrine.",
                });
                continue;
            }

            // Só a mensagem: o objeto de erro carrega a URL com os parâmetros de
            // afiliado do casal.
            console.warn(
                "[import] linha ignorada:",
                error instanceof Error ? error.message : "erro desconhecido"
            );
            rows.push({
                line: row.line,
                link: row.link,
                status: "erro",
                message: "Não foi possível importar esta linha.",
            });
        }
    }

    // O que ficou de fora do lote precisa ser dito, senão o casal acha que
    // importou tudo.
    for (const row of sheet.slice(batch.length)) {
        rows.push({
            line: row.line,
            link: row.link,
            status: "erro",
            message:
                existing + batch.length >= MAX_EXTERNAL_GIFTS
                    ? `A vitrine chegou ao limite de ${MAX_EXTERNAL_GIFTS} itens.`
                    : `Fora deste lote (máximo de ${MAX_IMPORT_ROWS} por vez). Importe de novo para continuar.`,
        });
    }

    const imported = rows.filter((r) => r.status === "importado").length;

    if (imported > 0) {
        revalidatePath("/admin");
        revalidatePath(`/${event.slug}`);
        revalidatePath(`/${event.slug}/vitrine`);
    }

    return { success: true, imported, rows };
}

export interface DeleteAllResult extends ActionResult {
    deleted?: number;
}

/**
 * Esvazia a vitrine inteira.
 *
 * Ação destrutiva e sem volta: além dos itens, apaga junto **as reservas já
 * feitas pelos convidados** (nome, telefone e recado). Por isso a tela mostra
 * quantas reservas serão perdidas antes de confirmar, e o rate limit aqui é
 * baixo — não existe motivo legítimo para esvaziar a vitrine várias vezes.
 */
export async function deleteAllExternalGifts(): Promise<DeleteAllResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `external-gift:delete-all:${session.userId}`,
            limit: 5,
            windowSeconds: 60 * 60,
            message: "Muitas exclusões em pouco tempo.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        select: { id: true, slug: true },
    });

    if (!event) return { success: false, message: "Evento não encontrado." };

    // O `where` pelo evento da sessão é o que garante que ninguém esvazie a
    // vitrine de outro casal.
    const result = await prisma.externalGift.deleteMany({ where: { eventId: event.id } });

    revalidatePath("/admin");
    revalidatePath(`/${event.slug}`);
    revalidatePath(`/${event.slug}/vitrine`);

    return { success: true, deleted: result.count };
}

export async function deleteExternalGift(id: string) {
    const session = await verifySession();

    const gift = await prisma.externalGift.findUnique({
        where: { id },
        select: { id: true, event: { select: { userId: true, slug: true } } },
    });

    if (!gift || gift.event.userId !== session.userId) {
        throw new Error("Não autorizado.");
    }

    await prisma.externalGift.delete({ where: { id } });

    revalidatePath("/admin");
    revalidatePath(`/${gift.event.slug}`);
    revalidatePath(`/${gift.event.slug}/vitrine`);
}

/**
 * Define ou limpa a etiqueta de cor de um item.
 *
 * A vitrine não tem edição de item (ficou fora da v1), mas a cor precisa ser
 * ajustável sem recadastrar: ela costuma ser descoberta DEPOIS, quando o casal
 * abre o anúncio e vê que tem variação — ou quando o convidado avisa que comprou
 * a errada. Recriar o item perderia a reserva de quem já escolheu.
 *
 * String vazia limpa a etiqueta.
 */
export async function setExternalGiftColor(id: string, colorTag: string): Promise<ActionResult> {
    const session = await verifySession();

    try {
        await enforceRateLimit({
            key: `external-gift:color:${session.userId}`,
            limit: 120,
            windowSeconds: 60 * 60,
            message: "Muitas alterações em pouco tempo.",
        });
    } catch (error) {
        if (error instanceof RateLimitError) return { success: false, message: error.message };
        throw error;
    }

    const parsed = ExternalGiftColorSchema.safeParse(colorTag);
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0]?.message ?? "Cor inválida" };
    }

    const gift = await prisma.externalGift.findUnique({
        where: { id },
        select: { id: true, event: { select: { userId: true, slug: true } } },
    });

    // Mesma resposta para "não existe" e "não é seu".
    if (!gift || gift.event.userId !== session.userId) {
        return { success: false, message: "Presente não encontrado." };
    }

    await prisma.externalGift.update({
        where: { id },
        data: { colorTag: parsed.data || null },
    });

    revalidatePath("/admin");
    revalidatePath(`/${gift.event.slug}/vitrine`);

    return { success: true };
}

/**
 * Devolve o presente à vitrine. Sem isto, um clique por engano trava o item para
 * sempre — a reserva não expira de propósito.
 */
export async function releaseExternalGiftReservation(id: string): Promise<ActionResult> {
    const session = await verifySession();

    const gift = await prisma.externalGift.findUnique({
        where: { id },
        select: { id: true, event: { select: { userId: true, slug: true } } },
    });

    // Mesma resposta para "não existe" e "não é seu": não confirma a existência
    // de um id alheio.
    if (!gift || gift.event.userId !== session.userId) {
        return { success: false, message: "Presente não encontrado." };
    }

    // Liberar APAGA os dados de quem reservou, não só o carimbo de data. A
    // finalidade da coleta (o casal falar com o convidado sobre aquele presente)
    // acaba junto com a reserva; guardar histórico de telefone seria reter dado
    // pessoal sem base legal — LGPD art. 15, I e art. 16.
    await prisma.externalGift.update({
        where: { id },
        data: {
            reservedAt: null,
            reservedName: null,
            reservedPhone: null,
            reservedMessage: null,
        },
    });

    revalidatePath("/admin");
    revalidatePath(`/${gift.event.slug}/vitrine`);

    return { success: true };
}
