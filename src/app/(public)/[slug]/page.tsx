import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicPageContent } from "./public-page-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      gifts: {
        where: { available: true },
        orderBy: { price: "asc" }
      }
    }
  });

  if (!event) {
    return notFound();
  }

  // CORREÇÃO 1: Serializar os dados (Converter Decimal para Number)
  const serializedEvent = {
    ...event,
    gifts: event.gifts.map(gift => ({
        ...gift,
        price: Number(gift.price) // Converte Decimal do Prisma para Number do JS
    }))
  };

  // Garante que a galeria seja um array
  const gallery = event.galleryImages.length > 0 
    ? event.galleryImages 
    : [];

  return (
    // Passamos o evento serializado
    <PublicPageContent 
        event={serializedEvent as any} // Cast necessário pois o tipo Prisma difere ligeiramente do tipo JS puro
        gallery={gallery}
    />
  );
}