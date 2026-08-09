import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { toPublicExternalGift } from "@/lib/external-gift";
import { VitrineContent } from "./vitrine-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * O estado "reservado" muda por ação de convidado, e uma página estática
 * mostraria como disponível um presente que já foi escolhido. O `updateMany` da
 * reserva protege a integridade, mas ver o item sumir depois de preencher o
 * formulário é experiência ruim. Tráfego de vitrine de casamento é baixo.
 */
export const dynamic = "force-dynamic";

async function getVitrineData(slug: string) {
  return await prisma.event.findUnique({
    where: { slug },
    select: {
      slug: true,
      coupleName: true,
      eventDate: true,
      externalGifts: {
        // Disponíveis primeiro: o que já foi reservado desce.
        orderBy: [
          { reservedAt: { sort: "asc", nulls: "first" } },
          { orderIndex: "asc" },
          { createdAt: "asc" },
        ],
        // `reservedName`, `reservedPhone` e `reservedMessage` NÃO são
        // selecionados: esta página é pública e tudo daqui vai para o HTML.
        // `toPublicExternalGift` é a segunda trava.
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          shortUrl: true,
          reservedAt: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getVitrineData(slug);

  if (!event) {
    return { title: "Vitrine não encontrada | BemCasados" };
  }

  return {
    title: `Vitrine de presentes | ${event.coupleName}`,
    description: `Presentes escolhidos por ${event.coupleName} para você comprar direto na loja.`,
    // Uma página cheia de link de afiliado não deve disputar indexação com a
    // página do casamento.
    robots: { index: false, follow: false },
  };
}

export default async function VitrinePage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getVitrineData(slug);

  if (!event) {
    return notFound();
  }

  const gifts = event.externalGifts.map((gift) =>
    toPublicExternalGift({ ...gift, imageUrl: mediaUrl(gift.imageUrl) })
  );

  return (
    // Mesma paleta do convite: o convidado chega aqui pelo botão "Sugestão de
    // presente" e a troca brusca de cor pareceria outro site.
    <main className="min-h-screen bg-[#0d1b34]">
      <header className="bg-[#0a1628] border-b border-[#c9a227]/25 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href={`/${event.slug}/convite`}
            className="text-sm text-slate-400 hover:text-[#c9a227] inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para o convite
          </Link>
          <h1 className="text-2xl md:text-3xl font-serif text-white mt-2">
            Vitrine de presentes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Escolhidos por {event.coupleName}
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {gifts.length === 0 ? (
          <div className="bg-[#0a1628] rounded-2xl border border-[#c9a227]/25 p-12 text-center">
            <ShoppingBag className="mx-auto text-[#c9a227]/40" size={44} />
            <p className="mt-4 text-slate-200 font-medium">
              O casal ainda não montou a vitrine.
            </p>
            <p className="text-sm text-slate-400 mt-1">Volte daqui a pouco 🙂</p>
          </div>
        ) : (
          <>
            <div className="bg-[#c9a227]/10 border border-[#c9a227]/30 rounded-xl p-4 mb-6 text-sm text-slate-200">
              Você compra direto no site da loja. Antes disso,{" "}
              <strong className="text-[#c9a227]">reserve o presente aqui</strong> para que
              nenhum outro convidado escolha o mesmo.
            </div>
            <VitrineContent gifts={gifts} />
          </>
        )}
      </div>
    </main>
  );
}
