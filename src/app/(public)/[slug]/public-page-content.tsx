'use client';

import { useState } from 'react';
import { GiftList } from '@/components/home/gift-list';
import { EventStories } from '@/components/public/event-stories';
import { Event, Gift } from '@prisma/client';

// Estendemos o tipo Event para incluir a relação de gifts
type EventWithGifts = Event & { gifts: Gift[] };

interface PublicPageContentProps {
    event: EventWithGifts;
    gallery: string[];
}

export function PublicPageContent({ event, gallery }: PublicPageContentProps) {
    // Se quiser pular a intro em desenvolvimento, mude para false
    const [showStories, setShowStories] = useState(true);

    return (
        <main className="min-h-screen bg-gray-50">
            {showStories ? (
                <EventStories 
                    images={gallery}
                    title={event.introTitle}
                    subtitle={event.introSubtitle}
                    message={event.welcomeMessage}
                    videoUrl={event.videoUrl}
                    onComplete={() => setShowStories(false)}
                />
            ) : (
                // AQUI ENTRA A SUA TELA DE LISTA DE PRESENTES
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
                        {/* Podemos repetir a mensagem dos noivos aqui se quiser */}
                        <div className="bg-rose-50 border border-rose-100 p-6 rounded-xl text-center">
                            <h2 className="text-lg font-bold text-rose-800 mb-2">Lista de Presentes</h2>
                            <p className="text-gray-600">
                                Fique à vontade para escolher um presente e fazer parte do nosso sonho!
                            </p>
                        </div>

                        {/* Seu componente de lista de presentes existente */}
                        {/* Precisamos adaptar o GiftList para receber dados ou buscar via API */}
                        {/* Por enquanto, vou renderizar um grid simples baseado no seu código anterior */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {event.gifts.map(gift => (
                                <div key={gift.id} className="bg-white p-4 rounded-xl border shadow-sm">
                                    {/* Card simplificado - Você pode usar seu componente GiftCard aqui */}
                                    <div className="aspect-video relative bg-gray-200 rounded-lg mb-4">
                                        {/* Imagem */}
                                    </div>
                                    <h3 className="font-bold">{gift.title}</h3>
                                    <p className="text-green-600 font-bold">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(gift.price))}
                                    </p>
                                    <button className="w-full mt-4 bg-rose-600 text-white py-2 rounded-lg font-medium">
                                        Presentear
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}