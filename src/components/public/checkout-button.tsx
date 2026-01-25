// src/components/public/checkout-button.tsx
"use client";

import { useState } from "react";
import { CheckoutModal } from "@/components/private/checkout/checkout-modal";
import { Heart } from "lucide-react";

// Definimos a interface baseada no que o CheckoutModal consome
interface GiftProps {
    id: string;
    title: string;
    price: number | string; // Suporta string do banco ou number do cálculo
    imageUrl?: string | null;
    available?: boolean;
    isExclusive?: boolean;
}

interface CheckoutButtonProps {
    gift: GiftProps;
}

export function CheckoutButton({ gift }: CheckoutButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Convertemos o preço para número caso venha como string/Decimal do Prisma
    const formattedGift = {
        ...gift,
        price: Number(gift.price)
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-gray-900 hover:bg-rose-600 text-white h-16 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-gray-200 active:scale-95 flex items-center justify-center gap-3"
            >
                <Heart size={20} fill="currentColor" />
                Presentear Noivos
            </button>

            {isModalOpen && (
                <CheckoutModal 
                    gift={formattedGift} 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                />
            )}
        </>
    );
}