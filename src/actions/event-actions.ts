'use server'

import { prisma } from "@/lib/prisma"
import { uploadFileToS3 } from "@/lib/s3"
import { verifySession } from "@/lib/dal"
import { revalidatePath } from "next/cache"

export async function updateEventSettings(formData: FormData) {
  const session = await verifySession()

  const event = await prisma.event.findFirst({
    where: { userId: session.userId },
  })

  if (!event) {
    throw new Error("Evento não encontrado")
  }

  // 1. Coleta campos de texto gerais
  const introTitle = formData.get("introTitle") as string
  const introSubtitle = formData.get("introSubtitle") as string
  const welcomeMessage = formData.get("welcomeMessage") as string
  const videoUrl = formData.get("videoUrl") as string
  
  // 2. Processamento da Galeria
  // O frontend vai mandar arrays paralelos: keptUrls[] com keptCaptions[], e newFiles[] com newCaptions[]
  
  const keptUrls = formData.getAll("keptUrls") as string[];
  const keptCaptions = formData.getAll("keptCaptions") as string[];
  
  const newFiles = formData.getAll("newFiles");
  const newCaptions = formData.getAll("newCaptions") as string[];
  
  interface FinalGalleryItem {
    imageUrl: string;
    caption: string | null;
  }
  
  let finalItems: FinalGalleryItem[] = [];

  // 2a. Adiciona os itens mantidos (já com suas legendas atualizadas)
  keptUrls.forEach((url, index) => {
    finalItems.push({
        imageUrl: url,
        caption: keptCaptions[index] || null
    });
  });

  // 2b. Processa uploads e adiciona os novos itens com suas legendas
  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i] as File;
    const caption = newCaptions[i] || null;
    
    if (file && file.size > 0 && typeof file.arrayBuffer === 'function') {
      try {
        const url = await uploadFileToS3(file);
        finalItems.push({ imageUrl: url, caption: caption });
      } catch (error) {
        console.error("Erro ao fazer upload do arquivo:", file.name, error);
      }
    }
  }

  // Limita a 10 itens
  finalItems = finalItems.slice(0, 10);

  // 3. Atualização Atômica no Banco (Transação)
  await prisma.$transaction(async (tx) => {
    // Atualiza dados gerais do evento
    await tx.event.update({
        where: { id: event.id },
        data: { introTitle, introSubtitle, welcomeMessage, videoUrl }
    });

    // Remove todos os itens de galeria antigos
    await tx.galleryItem.deleteMany({
        where: { eventId: event.id }
    });

    // Recria os itens na ordem correta
    if (finalItems.length > 0) {
        await tx.galleryItem.createMany({
            data: finalItems.map((item, index) => ({
                eventId: event.id,
                imageUrl: item.imageUrl,
                caption: item.caption,
                orderIndex: index
            }))
        });
    }
  });

  revalidatePath("/admin")
  revalidatePath(`/${event.slug}`)
  
  return { success: true }
}