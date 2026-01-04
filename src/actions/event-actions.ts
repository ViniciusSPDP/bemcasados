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

  // 1. Coleta os campos de texto
  const introTitle = formData.get("introTitle") as string
  const introSubtitle = formData.get("introSubtitle") as string
  const welcomeMessage = formData.get("welcomeMessage") as string
  const videoUrl = formData.get("videoUrl") as string
  
  // 2. Coleta imagens
  const keptImagesRaw = formData.getAll("keptImages") as string[];
  const newFiles = formData.getAll("newImages");
  
  const newImageUrls: string[] = [];

  // 3. Processa Uploads
  for (const item of newFiles) {
    const file = item as File;
    
    // Verifica se é um arquivo válido
    if (file && file.size > 0 && typeof file.arrayBuffer === 'function') {
      try {
        const url = await uploadFileToS3(file);
        newImageUrls.push(url);
      } catch (error) {
        console.error("Erro ao fazer upload do arquivo:", file.name, error);
      }
    }
  }

  // 4. Combina e limita a 10 fotos
  const finalGallery = [...keptImagesRaw, ...newImageUrls].slice(0, 10);

  // 5. Atualiza no Banco
  await prisma.event.update({
    where: { id: event.id },
    data: {
        introTitle,
        introSubtitle,
        welcomeMessage,
        videoUrl,
        galleryImages: finalGallery 
    }
  })

  revalidatePath("/admin")
  revalidatePath(`/${event.slug}`)
  
  return { success: true }
}