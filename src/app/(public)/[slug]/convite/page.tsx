import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { mediaUrl } from "@/lib/media";
import { InviteContent } from "./invite-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Sobrescreve o rose do layout raiz.
 *
 * No iPhone, a faixa da Dynamic Island e da barra de status assume esta cor:
 * com o rose padrão sobrava uma tarja rosa no topo de um convite azul-marinho.
 * Com o azul, o topo se funde ao convite e a tela parece inteira.
 */
export const viewport: Viewport = {
  themeColor: "#0a1628",
};

async function getInviteData(slug: string) {
  return await prisma.event.findUnique({
    where: { slug },
    // `select` explícito: tudo daqui vai para o HTML de uma página pública, e
    // `asaasApiKey`/`walletId` são credenciais do casal.
    select: {
      slug: true,
      coupleName: true,
      eventDate: true,
      monogram: true,
      inviteVerse: true,
      ceremonyTime: true,
      ceremonyVenue: true,
      ceremonyAddress: true,
      ceremonyMapsUrl: true,
      // Imagem própria do convite, independente da galeria dos stories.
      inviteImageUrl: true,
      _count: { select: { externalGifts: true, gifts: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getInviteData(slug);

  if (!event) return { title: "Convite não encontrado | BemCasados" };

  const cover = mediaUrl(event.inviteImageUrl) || "/og-image.jpg";

  return {
    title: `Convite | ${event.coupleName}`,
    description: `${event.coupleName} convidam você para a cerimônia de casamento.`,
    openGraph: {
      title: `Casamento de ${event.coupleName}`,
      description: "Você foi convidado! Toque para ver o convite.",
      url: `/${slug}/convite`,
      images: [{ url: cover, width: 1200, height: 630, alt: `Convite de ${event.coupleName}` }],
      type: "website",
    },
  };
}

export default async function ConvitePage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getInviteData(slug);

  if (!event) return notFound();

  return (
    <InviteContent
      slug={event.slug}
      coupleName={event.coupleName}
      // `Date` não atravessa a fronteira para o Client Component: vai como ISO.
      eventDate={event.eventDate.toISOString()}
      monogram={event.monogram}
      verse={event.inviteVerse}
      time={event.ceremonyTime}
      venue={event.ceremonyVenue}
      address={event.ceremonyAddress}
      mapsUrl={event.ceremonyMapsUrl}
      backgroundUrl={mediaUrl(event.inviteImageUrl)}
      hasVitrine={event._count.externalGifts > 0}
      hasGifts={event._count.gifts > 0}
    />
  );
}
