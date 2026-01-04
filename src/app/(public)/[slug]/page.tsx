import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicPageContent } from "./public-page-content";
import { StoryItem } from "@/components/public/event-stories";
import { Gift, Event as PrismaEvent, GalleryItem } from "@prisma/client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Definimos o tipo exato que o componente PublicPageContent vai receber.
// Isso substitui o "any" e garante segurança de tipos.
export interface SerializedGift extends Omit<Gift, "price"> {
  price: number;
}

export interface SerializedEvent extends PrismaEvent {
  gifts: SerializedGift[];
  galleryItems?: GalleryItem[]; // Opcional aqui pois passamos separado, mas bom ter na tipagem
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
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
  // Removemos galleryItems do objeto event principal para não duplicar dados desnecessários
  // e transformamos o preço dos presentes.
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