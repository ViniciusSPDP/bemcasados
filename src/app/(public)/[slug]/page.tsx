import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicPageContent } from "./public-page-content";
import { StoryItem } from "@/components/public/event-stories";
import { Gift, Event as PrismaEvent, GalleryItem } from "@prisma/client";
import { Metadata, ResolvingMetadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Tipagens
export interface SerializedGift extends Omit<Gift, "price"> {
  price: number;
}

export interface SerializedEvent extends PrismaEvent {
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

  // Tenta pegar a imagem do primeiro story, senão usa a imagem padrão do site
  const previousImages = (await parent).openGraph?.images || [];
  const coverImage = event.galleryItems[0]?.imageUrl || "/og-image.jpg"; // Certifique-se de ter essa imagem em public/

  const description = event.introSubtitle || `Lista de presentes e confirmação de presença para o casamento de ${event.coupleName}.`;

  return {
    title: `Casamento de ${event.coupleName}`,
    description: description,
    openGraph: {
      title: `Casamento de ${event.coupleName}`,
      description: description,
      url: `https://bemcasados.com/${slug}`, // Ajuste para seu domínio real em produção
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
  const storyItems: StoryItem[] = event.galleryItems.map((item) => ({
    id: item.id,
    imageUrl: item.imageUrl,
    caption: item.caption,
  }));

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
  const serializedEvent: SerializedEvent = {
    ...event,
    gifts: event.gifts.map((gift) => ({
      ...gift,
      price: Number(gift.price), // Converte Decimal para Number
    })),
  };

  return (
    <PublicPageContent
      event={serializedEvent}
      galleryItems={finalStoryItems}
    />
  );
}