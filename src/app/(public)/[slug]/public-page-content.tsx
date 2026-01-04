'use client';

import { useState } from 'react';
import { EventStories, StoryItem } from '@/components/public/event-stories';
import Image from 'next/image';
import { SerializedEvent, SerializedGift } from "./page";
import { CheckoutModal } from '@/components/private/checkout/checkout-modal';

interface PublicPageContentProps {
    event: SerializedEvent;
    galleryItems: StoryItem[];
}

export function PublicPageContent({ event, galleryItems }: PublicPageContentProps) {
    const [showStories, setShowStories] = useState(true);
    
    // ESTADO PARA CONTROLAR O MODAL DE CHECKOUT
    const [selectedGift, setSelectedGift] = useState<SerializedGift | null>(null);

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Modal de Checkout (Renderizado condicionalmente) */}
            {selectedGift && (
                <CheckoutModal 
                    gift={selectedGift as any} // Cast necessário se os tipos divergirem levemente (Decimal vs Number)
                    isOpen={!!selectedGift}
                    onClose={() => setSelectedGift(null)}
                />
            )}

            {showStories ? (
                <EventStories 
                    items={galleryItems} 
                    title={event.introTitle}
                    subtitle={event.introSubtitle}
                    message={event.welcomeMessage}
                    videoUrl={event.videoUrl}
                    onComplete={() => setShowStories(false)}
                />
            ) : (
                <div className="animate-in fade-in duration-1000">
                    <header className="bg-white border-b py-6 sticky top-0 z-20 shadow-sm">
                        <div className="max-w-4xl mx-auto px-4 text-center">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif">
                                {event.coupleName}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {new Date(event.eventDate).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                            </p>
                        </div>
                    </header>

                    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                        <div className="bg-rose-50 border border-rose-100 p-6 rounded-xl text-center">
                            <h2 className="text-lg font-bold text-rose-800 mb-2">Lista de Presentes</h2>
                            <p className="text-gray-600">
                                Fique à vontade para escolher um presente e fazer parte do nosso sonho!
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {event.gifts.map(gift => (
                                <div key={gift.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-full">
                                    <div className="aspect-video relative bg-gray-200 rounded-lg mb-4 overflow-hidden">
                                        {gift.imageUrl ? (
                                            <Image 
                                                src={gift.imageUrl} 
                                                alt={gift.title} 
                                                fill 
                                                className="object-cover transition hover:scale-105 duration-500" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                <span className="text-xs">Sem foto</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 text-lg line-clamp-2">{gift.title}</h3>
                                        {/* Se quiser mostrar descrição: <p className="text-sm text-gray-500 mt-1 line-clamp-2">{gift.description}</p> */}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-50">
                                        <p className="text-rose-600 font-bold text-xl mb-3">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(gift.price))}
                                        </p>
                                        <button 
                                            // AQUI ESTÁ A MÁGICA: Ao clicar, setamos o presente selecionado
                                            onClick={() => setSelectedGift(gift)}
                                            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold transition shadow-md hover:shadow-lg active:scale-95"
                                        >
                                            Presentear
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}