"use client";

import { useState } from "react";
import { CheckoutModal } from "../private/checkout/checkout-modal";
import { Gift, Heart } from "lucide-react";

//Tipagem
interface GiftItem{
    id: string;
    title: string;
    price: number;
    imageUrl: string | null;
    category: string | null;
}

interface GiftListProps{
    gifts: GiftItem[];
}

export function GiftList({ gifts }: GiftListProps){
    const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);

    return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gifts.map((gift) => (
          <div
            key={gift.id}
            className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 overflow-hidden flex flex-col"
          >
            {/* Imagem do Presente */}
            <div className="relative h-48 bg-stone-100 overflow-hidden">
              {gift.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gift.imageUrl}
                  alt={gift.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <Gift size={48} />
                </div>
              )}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-rose-600 shadow-sm">
                {gift.category || "Presente"}
              </div>
            </div>

            {/* Conteúdo do Card */}
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-bold text-stone-800 text-lg mb-1 group-hover:text-rose-600 transition-colors">
                {gift.title}
              </h3>
              
              <div className="mt-auto pt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-500">Valor do presente</p>
                  <p className="text-xl font-bold text-stone-900">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(gift.price)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedGift(gift)}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-3 rounded-full transition-colors flex items-center justify-center"
                >
                  <Heart size={20} className="fill-current" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* O Modal que criamos anteriormente */}
      <CheckoutModal
        isOpen={!!selectedGift}
        onClose={() => setSelectedGift(null)}
        gift={selectedGift}
      />
    </>
  );
}