import { prisma } from "@/lib/prisma";
import { GiftList } from "@/components/home/gift-list";
import { CalendarDays, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await prisma.event.findUnique({
    where: { slug: "casamento-teste" },
    include: {
      gifts: {
        where: { available: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        Evento não encontrado. Rode o seed!
      </div>
    );
  }

  const serializedGifts = event.gifts.map((gift) => ({
    ...gift,
    price: Number(gift.price),
  }));

  return (
    <main className="min-h-screen bg-[#FDFCF8]">
      {/* Hero Section (Topo) */}
      <div className="bg-rose-50 border-b border-rose-100 pb-16 pt-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-1 rounded-full bg-white border border-rose-200 text-rose-600 text-sm font-medium tracking-wide mb-4">
            Lista de Casamento Virtual
          </div>

          <h1 className="text-5xl md:text-7xl font-serif text-stone-800 tracking-tight">
            {event.coupleName}
          </h1>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-stone-600 text-sm md:text-base font-medium">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-rose-500" />
              <span>
                {new Date(event.eventDate).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-stone-300" />
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-rose-500" />
              <span>Cerimônia & Recepção</span>
            </div>
          </div>

          <p className="max-w-2xl mx-auto text-stone-500 leading-relaxed pt-4">
            Queridos convidados, criamos esta lista de presentes simbólicos. O
            valor escolhido será revertido para nos ajudar a construir nosso
            futuro e realizar nossa lua de mel dos sonhos!
          </p>
        </div>
      </div>

      {/* Grid de Presentes */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-serif text-stone-800 mb-2">
            Escolha um presente
          </h2>
          <div className="h-1 w-20 bg-rose-400 mx-auto rounded-full" />
        </div>

        {/* Aqui entra o componente Cliente */}
        <GiftList gifts={serializedGifts} />
      </div>

      {/* Rodapé simples */}
      <footer className="bg-white border-t border-stone-100 py-10 text-center text-stone-400 text-sm">
        <p>© 2024 {event.coupleName}. Feito com amor.</p>
      </footer>
    </main>
  );
}
