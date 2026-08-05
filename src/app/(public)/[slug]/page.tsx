import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicPageContent } from "./public-page-content";
import { StoryItem } from "@/components/public/event-stories";
import { Gift, Event as PrismaEvent, GalleryItem } from "@prisma/client";
import { Metadata, ResolvingMetadata } from "next";
import { mediaUrl } from "@/lib/media";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Tipagens
export interface SerializedGift extends Omit<Gift, "price"> {
  price: number;
}

/**
 * Este objeto é serializado para um Client Component, ou seja, vai parar no HTML
 * da página pública. `asaasApiKey` e `walletId` são credenciais do casal e ficam
 * fora do tipo de propósito — assim o compilador impede que voltem por descuido.
 */
export interface SerializedEvent extends Omit<PrismaEvent, "asaasApiKey" | "walletId"> {
  gifts: SerializedGift[];
  galleryItems?: GalleryItem[];
}

// --- 1. FUNÇÃO DE BUSCA REUTILIZÁVEL ---
// Centralizamos a query aqui. O Next.js faz deduplicação automática dessa requisição.
async function getEventData(slug: string) {
  return await prisma.event.findUnique({
    where: { slug },
    include: {
      galleryItems: {
        orderBy: { orderIndex: "asc" },
      },
      gifts: {
        where: { available: true },
        orderBy: { price: "asc" },
      },
    },
  });
}

// --- 2. GERAÇÃO DE METADADOS (SEO) ---
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventData(slug);

  if (!event) {
    return {
      title: "Evento não encontrado | BemCasados",
    };
  }

  // Tenta pegar a imagem do primeiro story, senão usa a imagem padrão do site.
  // O caminho relativo é resolvido pelo `metadataBase` do layout raiz.
  const previousImages = (await parent).openGraph?.images || [];
  const coverImage = mediaUrl(event.galleryItems[0]?.imageUrl) || "/og-image.jpg";

  const description = event.introSubtitle || `Lista de presentes e confirmação de presença para o casamento de ${event.coupleName}.`;

  return {
    title: `Casamento de ${event.coupleName}`,
    description: description,
    openGraph: {
      title: `Casamento de ${event.coupleName}`,
      description: description,
      // Relativo de propósito: o `metadataBase` do layout raiz resolve com o
      // domínio real. Estava fixo em bemcasados.com, que não é o domínio do site.
      url: `/${slug}`,
      siteName: "BemCasados",
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: `Foto de ${event.coupleName}`,
        },
        ...previousImages,
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Casamento de ${event.coupleName}`,
      description: description,
      images: [coverImage],
    },
  };
}

// --- 3. COMPONENTE DA PÁGINA ---
export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Reutiliza a função de busca
  const event = await getEventData(slug);

  if (!event) {
    return notFound();
  }

  // 1. Tratamento da Galeria (Stories)
  // O banco guarda a chave do objeto; `mediaUrl` resolve para /api/media/<chave>.
  const storyItems: StoryItem[] = event.galleryItems.flatMap((item) => {
    const url = mediaUrl(item.imageUrl);
    return url ? [{ id: item.id, imageUrl: url, caption: item.caption }] : [];
  });

  const finalStoryItems: StoryItem[] =
    storyItems.length > 0
      ? storyItems
      : [
          {
            id: "placeholder-1",
            imageUrl: "https://placehold.co/1080x1920/9f1239/fff?text=Foto+1",
            caption: "Nossa história começa aqui...",
          },
          {
            id: "placeholder-2",
            imageUrl: "https://placehold.co/1080x1920/881337/fff?text=Foto+2",
            caption: "Momentos inesquecíveis.",
          },
          {
            id: "placeholder-3",
            imageUrl: "https://placehold.co/1080x1920/4c0519/fff?text=Foto+3",
            caption: null,
          },
        ];

  // 2. Serialização do Evento (Decimal -> Number)
  // `asaasApiKey` e `walletId` são segredos do casal e não podem sair do servidor.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { asaasApiKey, walletId, ...publicEvent } = event;

  const serializedEvent: SerializedEvent = {
    ...publicEvent,
    gifts: event.gifts.map((gift) => ({
      ...gift,
      price: Number(gift.price), // Converte Decimal para Number
      imageUrl: mediaUrl(gift.imageUrl),
    })),
  };

  return (
    <PublicPageContent
      event={serializedEvent}
      galleryItems={finalStoryItems}
    />
  );
}