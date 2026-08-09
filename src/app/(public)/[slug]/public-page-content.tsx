'use client'

import { useState } from 'react';
import { EventStories, StoryItem } from '@/components/public/event-stories';
import Image from 'next/image';
import { SerializedEvent, SerializedGift } from "./page";
import { CheckoutModal } from '@/components/private/checkout/checkout-modal';
import { formatEventDate } from '@/lib/event-date';
// 1. ADICIONEI "Variants" NA IMPORTAÇÃO AQUI
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface PublicPageContentProps {
    event: SerializedEvent;
    galleryItems: StoryItem[];
    /** Quantos itens o casal pôs na vitrine do Mercado Livre. */
    externalGiftCount?: number;
}

// --- COMPONENTE: O ENVELOPE ANIMADO ---
function OpeningEnvelope({ onOpenComplete }: { onOpenComplete: () => void }) {
    const [isOpening, setIsOpening] = useState(false);

    const handleButtonClick = () => {
        setIsOpening(true);
        setTimeout(() => {
            onOpenComplete();
        }, 1500);
    };

    // 2. CORREÇÃO: Adicionei ": Variants" para o TypeScript entender os tipos
    const flapVariants: Variants = {
        closed: { rotateX: 0 },
        open: { 
            rotateX: 180, 
            transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } 
        }
    };

    // 3. CORREÇÃO: Adicionei ": Variants" aqui também
    const cardVariants: Variants = {
        closed: { y: 0 },
        open: { 
            y: -220, 
            scale: 1.05, 
            zIndex: 20, 
            transition: { delay: 0.4, duration: 0.8, type: "spring", stiffness: 60 } 
        }
    };
    
    const buttonVariants: Variants = {
        closed: { opacity: 1, scale: 1 },
        open: { opacity: 0, scale: 0.9, transition: { duration: 0.3 } }
    };

    return (
        <motion.div 
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)", transition: { duration: 0.8 } }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-rose-900/30 via-black to-black" />

            {/* CORREÇÃO CSS: h-100 não existe padrão, usei h-[400px] */}
            <div className="relative w-full max-w-sm h-100 mb-10 perspective-1000 mx-4">

                {/* --- O CARTÃO CONVITE --- */}
                <motion.div
                    // CORREÇÃO CSS: h-95 -> h-[380px]
                    className="absolute left-4 right-4 top-2 h-95 bg-[#fffdfa] rounded-t-lg p-6 text-center shadow-xl flex flex-col items-center justify-start border-x border-t border-gray-100"
                    variants={cardVariants}
                    initial="closed"
                    animate={isOpening ? "open" : "closed"}
                    style={{ transformOrigin: "bottom center" }}
                >
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4 mx-auto mt-4">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>

                    <div className="space-y-3">
                        {/* CORREÇÃO CSS: wrap-break-word -> break-words */}
                        <h1 className="text-3xl font-black tracking-tighter uppercase leading-none text-gray-800 wrap-break-word">
                            Você foi<br /><span className="text-rose-600">Convocado</span>
                        </h1>
                        <p className="text-sm font-serif text-gray-500 tracking-widest uppercase">
                            Para celebrar o amor
                        </p>
                    </div>
                    
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply rounded-t-lg"></div>
                </motion.div>


                {/* --- CORPO DO ENVELOPE --- */}
                {/* CORREÇÃO CSS: h-62.5 -> h-[250px] */}
                <div className="absolute inset-x-0 bottom-0 h-62.5 bg-rose-50 border-t border-rose-100 rounded-b-xl z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] overflow-hidden">
                     <div className="absolute inset-0 opacity-20 bg-[conic-gradient(at_bottom,var(--tw-gradient-stops))] from-rose-200 via-transparent to-transparent"></div>
                    <div className="w-full h-full flex items-end justify-center pb-12 relative z-20">
                        
                        <motion.button 
                            variants={buttonVariants}
                            initial="closed"
                            animate={isOpening ? "open" : "closed"}
                            onClick={handleButtonClick}
                            className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-full shadow-lg uppercase tracking-wide text-sm flex items-center gap-2"
                        >
                            <span>Abrir Convite</span>
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 animate-bounce">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                            </svg>
                        </motion.button>
                    </div>
                </div>


                {/* --- ABA DO ENVELOPE --- */}
                {/* CORREÇÃO CSS: top-37.5 -> top-[150px], h-37.5 -> h-[150px] */}
                <div className="absolute inset-x-0 top-37.5 h-37.5 z-30 pointer-events-none perspective-1000">
                    <motion.div
                        variants={flapVariants}
                        initial="closed"
                        animate={isOpening ? "open" : "closed"}
                        style={{ transformOrigin: "top" }}
                        className="w-full h-full relative"
                    >
                         {/* O triângulo da aba */}
                         {/* CORREÇÃO CSS: Usei valores arbitrários [] pois 190 e 140 não existem no tailwind padrão */}
                         <div 
                            className="absolute top-0 inset-x-0 h-0 border-l-190 border-r-190 border-t-140 border-l-transparent border-r-transparent border-t-rose-100 filter drop-shadow-md"
                            style={{ left: '50%', transform: 'translateX(-50%)' }}
                         ></div>
                         <div className="absolute inset-0 bg-rose-50 opacity-50 clip-path-triangle"></div>
                    </motion.div>
                </div>

            </div>
        </motion.div>
    );
}


// --- PÁGINA PRINCIPAL ---
export function PublicPageContent({ event, galleryItems, externalGiftCount = 0 }: PublicPageContentProps) {
    const [showEnvelope, setShowEnvelope] = useState(true);
    const [showStories, setShowStories] = useState(false);
    const [selectedGift, setSelectedGift] = useState<SerializedGift | null>(null);

    const handleEnvelopeSequenceComplete = () => {
        setShowEnvelope(false);
        setTimeout(() => {
           setShowStories(true);
        }, 100); 
    };

    const handleStoriesComplete = () => {
        setShowStories(false);
    };

    return (
        <main className="min-h-screen bg-gray-50 font-sans overflow-hidden">
            
            <AnimatePresence>
                {showEnvelope && (
                    <OpeningEnvelope key="envelope" onOpenComplete={handleEnvelopeSequenceComplete} />
                )}
            </AnimatePresence>

            {selectedGift && (
                <CheckoutModal 
                    gift={selectedGift} 
                    isOpen={!!selectedGift}
                    onClose={() => setSelectedGift(null)}
                />
            )}

            {!showEnvelope && showStories && (
                <EventStories 
                    items={galleryItems} 
                    title={event.introTitle}
                    subtitle={event.introSubtitle}
                    message={event.welcomeMessage}
                    videoUrl={event.videoUrl}
                    onComplete={handleStoriesComplete}
                />
            )}

            {!showEnvelope && !showStories && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                     <header className="bg-white border-b py-6 sticky top-0 z-20 shadow-sm/50 backdrop-blur-md">
                        <div className="max-w-4xl mx-auto px-4 text-center">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif">
                                {event.coupleName}
                            </h1>
                            {/*
                              `formatEventDate` lê em UTC. Este bloco renderiza
                              só depois da hidratação (fica atrás do envelope e
                              dos stories), então o `toLocaleDateString` que
                              estava aqui usava o fuso do CELULAR do convidado —
                              e no Brasil, UTC-3, mostrava o dia anterior.
                            */}
                            <p className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mt-1">
                                {formatEventDate(event.eventDate)}
                            </p>
                        </div>
                    </header>

                    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                        <div className="bg-rose-50 border border-rose-100 p-6 rounded-xl text-center shadow-sm">
                            <h2 className="text-lg font-bold text-rose-900 mb-2 font-serif">Lista de Presentes</h2>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Fique à vontade para escolher um presente e fazer parte do nosso sonho!
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-12">
                            {event.gifts.map(gift => (
                                <div key={gift.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                                    <div className="aspect-video relative bg-gray-50 rounded-lg mb-4 overflow-hidden group">
                                        {gift.imageUrl ? (
                                            <Image 
                                                src={gift.imageUrl} 
                                                alt={gift.title} 
                                                fill 
                                                className="object-cover transition duration-700 group-hover:scale-110" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                <span className="text-xs">Sem foto</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 space-y-2">
                                        <h3 className="font-bold text-gray-800 text-base line-clamp-2">{gift.title}</h3>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-50">
                                        <p className="text-rose-600 font-bold text-lg mb-3">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(gift.price))}
                                        </p>
                                        <button 
                                            onClick={() => setSelectedGift(gift)}
                                            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-medium text-sm transition shadow hover:shadow-lg active:scale-95"
                                        >
                                            Presentear
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* A vitrine tem página própria: o estado do envelope e dos
                            stories vive aqui e não sobrevive a uma navegação, então
                            uma aba interna não seria compartilhável nem sobreviveria
                            a um refresh. */}
                        {externalGiftCount > 0 && (
                            <a
                                href={`/${event.slug}/vitrine`}
                                className="block bg-white border border-rose-100 rounded-xl p-6 text-center shadow-sm hover:shadow-md hover:border-rose-200 transition mb-12"
                            >
                                <h2 className="text-lg font-bold text-rose-900 mb-2 font-serif">
                                    Presentes na loja
                                </h2>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {externalGiftCount}{' '}
                                    {externalGiftCount === 1 ? 'item escolhido' : 'itens escolhidos'} pelo
                                    casal no Mercado Livre. Você compra direto por lá e reserva aqui para
                                    ninguém repetir.
                                </p>
                                <span className="inline-block mt-3 text-rose-600 font-medium text-sm">
                                    Ver a vitrine →
                                </span>
                            </a>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}