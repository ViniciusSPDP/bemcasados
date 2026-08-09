'use server'

import { prisma } from "@/lib/prisma"
import { uploadFileToS3, UploadValidationError } from "@/lib/s3"
import { verifySession } from "@/lib/dal"
import { UpdateEventSettingsSchema, UpdateInviteSchema, UpdateWeddingSchema, UpdateSlugSchema } from "@/lib/definitions"
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/actions/gift-actions"

const MAX_GALLERY_ITEMS = 10

/** Nome do casal, título e data. Aparecem no convite e na página pública. */
export async function updateWeddingDetails(formData: FormData): Promise<ActionResult> {
  const session = await verifySession()

  try {
    await enforceRateLimit({
      key: `wedding:update:${session.userId}`,
      limit: 30,
      windowSeconds: 60 * 60,
      message: "Muitas alterações em pouco tempo.",
    })
  } catch (error) {
    if (error instanceof RateLimitError) return { success: false, message: error.message }
    throw error
  }

  const parsed = UpdateWeddingSchema.safeParse({
    coupleName: formData.get("coupleName"),
    title: formData.get("title"),
    eventDate: formData.get("eventDate"),
  })

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const event = await prisma.event.findFirst({
    where: { userId: session.userId },
    select: { id: true, slug: true },
  })

  if (!event) return { success: false, message: "Evento não encontrado." }

  await prisma.event.update({ where: { id: event.id }, data: parsed.data })

  revalidatePath("/admin")
  revalidatePath(`/${event.slug}`)
  revalidatePath(`/${event.slug}/convite`)

  return { success: true }
}

/**
 * Troca o endereço público do evento.
 *
 * Separada das demais de propósito: o slug é a URL que os convidados já podem
 * ter recebido, então mudar quebra todo link distribuído. A tela avisa; aqui
 * garante-se apenas que o novo endereço é válido, livre e não colide com uma
 * rota da aplicação.
 */
export async function updateEventSlug(formData: FormData): Promise<ActionResult> {
  const session = await verifySession()

  try {
    await enforceRateLimit({
      key: `slug:update:${session.userId}`,
      limit: 5,
      windowSeconds: 60 * 60,
      message: "Muitas trocas de endereço.",
    })
  } catch (error) {
    if (error instanceof RateLimitError) return { success: false, message: error.message }
    throw error
  }

  const parsed = UpdateSlugSchema.safeParse({ slug: formData.get("slug") })
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Endereço inválido" }
  }

  const event = await prisma.event.findFirst({
    where: { userId: session.userId },
    select: { id: true, slug: true },
  })

  if (!event) return { success: false, message: "Evento não encontrado." }
  if (event.slug === parsed.data.slug) return { success: true }

  try {
    await prisma.event.update({ where: { id: event.id }, data: { slug: parsed.data.slug } })
  } catch (error) {
    // P2002 = violação do índice único de `slug`.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { success: false, message: "Este endereço já está sendo usado por outro casal." }
    }
    throw error
  }

  revalidatePath("/admin")
  revalidatePath(`/${event.slug}`)
  revalidatePath(`/${parsed.data.slug}`)

  return { success: true }
}

/**
 * Dados do convite virtual. Fica separada de `updateEventSettings` de propósito:
 * aquela mexe na galeria dentro de uma transação, e um formulário de texto
 * simples não deveria carregar esse risco junto.
 *
 * Campo em branco vira `null`, não string vazia — é assim que o convite decide
 * esconder a seção correspondente.
 */
export async function updateInviteSettings(formData: FormData): Promise<ActionResult> {
  const session = await verifySession()

  try {
    await enforceRateLimit({
      key: `invite:update:${session.userId}`,
      limit: 30,
      windowSeconds: 60 * 60,
      message: "Muitas alterações em pouco tempo.",
    })
  } catch (error) {
    if (error instanceof RateLimitError) return { success: false, message: error.message }
    throw error
  }

  const parsed = UpdateInviteSchema.safeParse({
    monogram: formData.get("monogram") ?? "",
    inviteVerse: formData.get("inviteVerse") ?? "",
    ceremonyTime: formData.get("ceremonyTime") ?? "",
    ceremonyVenue: formData.get("ceremonyVenue") ?? "",
    ceremonyAddress: formData.get("ceremonyAddress") ?? "",
    ceremonyMapsUrl: formData.get("ceremonyMapsUrl") ?? "",
  })

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  // O evento vem da sessão, nunca do formulário: é o que garante que o casal só
  // edita o próprio convite.
  const event = await prisma.event.findFirst({
    where: { userId: session.userId },
    select: { id: true, slug: true, inviteImageUrl: true },
  })

  if (!event) {
    return { success: false, message: "Evento não encontrado." }
  }

  const d = parsed.data

  // A imagem de fundo é opcional e tem três caminhos: enviar uma nova, remover
  // a atual, ou não mexer. `undefined` no `data` do Prisma significa "não
  // alterar" — é o que mantém a foto quando o casal só editou o texto.
  let inviteImageUrl: string | null | undefined = undefined

  if (formData.get("removeInviteImage") === "1") {
    inviteImageUrl = null
  }

  const file = formData.get("inviteImage")
  if (file instanceof File && file.size > 0) {
    try {
      inviteImageUrl = await uploadFileToS3(file)
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return { success: false, message: error.message }
      }
      console.error("Falha no upload da imagem do convite")
      return { success: false, message: "Não foi possível enviar a imagem." }
    }
  }

  await prisma.event.update({
    where: { id: event.id },
    data: {
      monogram: d.monogram || null,
      inviteVerse: d.inviteVerse || null,
      ceremonyTime: d.ceremonyTime || null,
      ceremonyVenue: d.ceremonyVenue || null,
      ceremonyAddress: d.ceremonyAddress || null,
      ceremonyMapsUrl: d.ceremonyMapsUrl || null,
      inviteImageUrl,
    },
  })

  revalidatePath("/admin")
  revalidatePath(`/${event.slug}/convite`)

  return { success: true }
}

/**
 * Erros de validação são retornados, não lançados: em produção o Next troca a
 * mensagem de uma exceção de Server Action por um digest genérico.
 */
export async function updateEventSettings(formData: FormData): Promise<ActionResult> {
  const session = await verifySession()

  try {
    await enforceRateLimit({
      key: `event:update:${session.userId}`,
      limit: 30,
      windowSeconds: 60 * 60,
      message: "Muitas alterações em pouco tempo.",
    })
  } catch (error) {
    if (error instanceof RateLimitError) return { success: false, message: error.message }
    throw error
  }

  const event = await prisma.event.findFirst({
    where: { userId: session.userId },
    select: { id: true, slug: true },
  })

  if (!event) {
    return { success: false, message: "Evento não encontrado." }
  }

  // 1. Campos de texto — validados e com limite de tamanho
  const keptCaptions = formData.getAll("keptCaptions").map(String)
  const newCaptions = formData.getAll("newCaptions").map(String)

  const parsed = UpdateEventSettingsSchema.safeParse({
    introTitle: formData.get("introTitle") ?? '',
    introSubtitle: formData.get("introSubtitle") ?? '',
    welcomeMessage: formData.get("welcomeMessage") ?? '',
    videoUrl: formData.get("videoUrl") ?? '',
    captions: [...keptCaptions, ...newCaptions],
  })

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const { introTitle, introSubtitle, welcomeMessage, videoUrl } = parsed.data

  interface FinalGalleryItem {
    imageUrl: string
    caption: string | null
  }

  const finalItems: FinalGalleryItem[] = []

  // 2a. Itens mantidos.
  //
  // O cliente manda de volta o que deve permanecer, então esses valores são
  // entrada não confiável: antes eram gravados verbatim, o que permitia apontar
  // a galeria pública para qualquer URL. Agora só passa chave nossa que já
  // pertence a este evento.
  const keptKeys = formData.getAll("keptUrls").map(String)

  const ownedKeys = new Set(
    (
      await prisma.galleryItem.findMany({
        where: { eventId: event.id },
        select: { imageUrl: true },
      })
    ).map((item) => item.imageUrl)
  )

  // `seen` evita que a mesma chave repetida no formulário vire várias linhas.
  const seen = new Set<string>()

  keptKeys.forEach((key, index) => {
    // A checagem de posse é o que impede apontar a galeria para uma imagem
    // arbitrária; o índice usado na legenda é o original, para os pares
    // imagem/legenda não desalinharem quando algum item é descartado.
    if (!ownedKeys.has(key)) return
    if (seen.has(key)) return
    if (finalItems.length >= MAX_GALLERY_ITEMS) return

    seen.add(key)
    finalItems.push({ imageUrl: key, caption: keptCaptions[index]?.trim() || null })
  })

  // 2b. Novos uploads
  const newFiles = formData.getAll("newFiles")

  for (let i = 0; i < newFiles.length; i++) {
    if (finalItems.length >= MAX_GALLERY_ITEMS) break

    const file = newFiles[i]
    if (!(file instanceof File) || file.size === 0) continue

    try {
      const key = await uploadFileToS3(file)
      finalItems.push({ imageUrl: key, caption: newCaptions[i]?.trim() || null })
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return { success: false, message: error.message }
      }
      console.error("Falha no upload de item da galeria")
      return { success: false, message: "Não foi possível enviar uma das imagens." }
    }
  }

  // 3. Atualização atômica
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: event.id },
      data: { introTitle, introSubtitle, welcomeMessage, videoUrl },
    })

    await tx.galleryItem.deleteMany({ where: { eventId: event.id } })

    if (finalItems.length > 0) {
      await tx.galleryItem.createMany({
        data: finalItems.map((item, index) => ({
          eventId: event.id,
          imageUrl: item.imageUrl,
          caption: item.caption,
          orderIndex: index,
        })),
      })
    }
  })

  revalidatePath("/admin")
  revalidatePath(`/${event.slug}`)

  return { success: true }
}
