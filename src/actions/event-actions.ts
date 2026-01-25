'use server'

import { prisma } from "@/lib/prisma"
import { uploadFileToS3 } from "@/lib/s3"
import { verifySession } from "@/lib/dal"
import { revalidatePath } from "next/cache"
import { createAsaasSubAccount, getAsaasBalance, getAsaasOnboardingLink, transferAsaasBalance } from "@/services/asaas"

// Definição de tipo para o estado da Action
interface ActionState {
    success: boolean;
    message: string;
    url?: string;
}

export async function updateEventSettings(formData: FormData) {
  const session = await verifySession()

  const event = await prisma.event.findFirst({
    where: { userId: session.userId },
  })

  if (!event) {
    throw new Error("Evento não encontrado")
  }

  const introTitle = formData.get("introTitle") as string
  const introSubtitle = formData.get("introSubtitle") as string
  const welcomeMessage = formData.get("welcomeMessage") as string
  const videoUrl = formData.get("videoUrl") as string
  
  const keptUrls = formData.getAll("keptUrls") as string[];
  const keptCaptions = formData.getAll("keptCaptions") as string[];
  
  const newFiles = formData.getAll("newFiles");
  const newCaptions = formData.getAll("newCaptions") as string[];
  
  interface FinalGalleryItem {
    imageUrl: string;
    caption: string | null;
  }
  
  let finalItems: FinalGalleryItem[] = [];

  keptUrls.forEach((url, index) => {
    finalItems.push({
        imageUrl: url,
        caption: keptCaptions[index] || null
    });
  });

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

  finalItems = finalItems.slice(0, 10);

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
        where: { id: event.id },
        data: { introTitle, introSubtitle, welcomeMessage, videoUrl }
    });

    await tx.galleryItem.deleteMany({
        where: { eventId: event.id }
    });

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

/**
 * Action para configurar a subconta Asaas
 */
export async function setupAsaasAction(
    _prevState: ActionState | undefined, 
    formData: FormData
): Promise<ActionState> {
    const session = await verifySession();
    
    const user = await prisma.user.findUnique({
        where: { id: session.userId }
    });

    const event = await prisma.event.findFirst({ 
        where: { userId: session.userId } 
    });

    if (!event || !user) {
        return { success: false, message: "Evento ou usuário não encontrado" };
    }

    try {
        const rawData = {
            name: event.coupleName,
            email: formData.get("asaasEmail") as string,
            cpfCnpj: formData.get("cpfCnpj") as string,
            birthDate: formData.get("birthDate") as string,
            mobilePhone: formData.get("mobilePhone") as string,
            incomeValue: Number(formData.get("incomeValue")),
            address: formData.get("address") as string,
            addressNumber: formData.get("addressNumber") as string,
            province: formData.get("province") as string,
            postalCode: formData.get("postalCode") as string,
        };

        const asaasAccount = await createAsaasSubAccount(rawData);

        await prisma.event.update({
            where: { id: event.id },
            data: {
                asaasApiKey: asaasAccount.apiKey,
                walletId: asaasAccount.walletId
            }
        });

        revalidatePath("/admin");
        return { success: true, message: "Conta configurada com sucesso!" };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao configurar conta";
        return { success: false, message: errorMessage };
    }
}

/**
 * Action para obter o link de verificação de documentos
 */
export async function getVerificationLinkAction(): Promise<ActionState> {
    const session = await verifySession();
    const event = await prisma.event.findFirst({ 
        where: { userId: session.userId } 
    });

    if (!event || !event.asaasApiKey) {
        return { success: false, message: "Configuração de pagamento não encontrada." };
    }

    try {
        const url = await getAsaasOnboardingLink(event.asaasApiKey);
        return { success: true, message: "Link gerado", url };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Erro ao obter link";
        return { success: false, message: msg };
    }
}

/**
 * Action para salvar a chave PIX no banco de dados
 */
export async function saveBankSettingsAction(
    _prevState: ActionState | undefined, 
    formData: FormData
): Promise<ActionState> {
    const session = await verifySession();
    const pixKey = formData.get("pixKey") as string;

    // 1. Buscamos o evento primeiro para ter o ID único
    const event = await prisma.event.findFirst({
        where: { userId: session.userId }
    });

    if (!event) {
        return { success: false, message: "Evento não encontrado." };
    }

    try {
        // 2. Atualizamos usando o ID único do evento
        await prisma.event.update({
            where: { id: event.id },
            data: { pixKey }
        });
        
        revalidatePath("/admin");
        return { success: true, message: "Dados bancários salvos com sucesso!" };
    } catch (error: unknown) {
        console.error("Erro ao salvar PIX:", error);
        return { success: false, message: "Erro ao salvar dados no banco." };
    }
}


export async function requestWithdrawalAction(): Promise<ActionState> {
    const session = await verifySession();
    const event = await prisma.event.findFirst({ where: { userId: session.userId } });

    if (!event || !event.asaasApiKey || !event.pixKey) {
        return { success: false, message: "Dados bancários ou configuração de pagamento ausentes." };
    }

    try {
        // 1. Pegar o saldo disponível real no momento
        const balance = await getAsaasBalance(event.asaasApiKey);

        if (balance <= 5) { // Considerando a taxa fixa do Asaas de R$ 5,00
            return { success: false, message: "Saldo insuficiente para cobrir as taxas de saque." };
        }

        // 2. Solicitar transferência
        const result = await transferAsaasBalance(event.asaasApiKey, balance, event.pixKey);
        
        if (result.success) {
            revalidatePath("/admin");
            return { success: true, message: result.message };
        }
        
        return { success: false, message: result.message };
    } catch {
        return { success: false, message: "Falha ao processar o saque." };
    }
}