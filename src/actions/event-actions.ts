'use server'

import { prisma } from "@/lib/prisma"
import { uploadFileToS3, UploadValidationError } from "@/lib/s3"
import { verifySession } from "@/lib/dal"
import { UpdateEventSettingsSchema } from "@/lib/definitions"
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/actions/gift-actions"

const MAX_GALLERY_ITEMS = 10

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
      message: "Muitas alterações em pouco tempo. Tente novamente mais tarde.",
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
