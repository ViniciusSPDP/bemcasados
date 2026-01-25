'use client'

import { useState } from 'react';
import { EventStories, StoryItem } from '@/components/public/event-stories';
import { SerializedEvent } from "./page";
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Heart, Calendar, ArrowRight, Music, Sparkles } from 'lucide-react';
import SuccessPage from './sucesso/page';

interface PublicPageContentProps {
    event: SerializedEvent;
    galleryItems: StoryItem[];
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

    const flapVariants: Variants = {
        closed: { rotateX: 0 },
        open: { 
            rotateX: 180, 
            transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } 
        }
    };

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

            <div className="relative w-full max-w-sm h-100 mb-10 perspective-1000 mx-4">
                <motion.div
                    className="absolute left-4 right-4 top-2 h-95 bg-[#fffdfa] rounded-t-lg p-6 text-center shadow-xl flex flex-col items-center justify-start border-x border-t border-gray-100"
                    variants={cardVariants}
                    initial="closed"
                    animate={isOpening ? "open" : "closed"}
                    style={{ transformOrigin: "bottom center" }}
                >
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4 mx-auto mt-4">
                         <Heart className="h-6 w-6 text-rose-500" fill="currentColor" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-black tracking-tighter uppercase leading-none text-gray-800 wrap-break-word">
                            Você foi<br /><span className="text-rose-600">Convocado</span>
                        </h1>
                        <p className="text-sm font-serif text-gray-500 tracking-widest uppercase">
                            Para celebrar o amor
                        </p>
                    </div>
                    
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply rounded-t-lg"></div>
                </motion.div>

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

                <div className="absolute inset-x-0 top-37.5 h-37.5 z-30 pointer-events-none perspective-1000">
                    <motion.div
                        variants={flapVariants}
                        initial="closed"
                        animate={isOpening ? "open" : "closed"}
                        style={{ transformOrigin: "top" }}
                        className="w-full h-full relative"
                    >
                         <div 
                            className="absolute top-0 inset-x-0 h-0 border-l-190 border-r-190 border-t-140 border-l-transparent border-r-transparent border-t-rose-100 filter drop-shadow-md"
                            style={{ left: '50%', transform: 'translateX(-50%)' }}
                         ></div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

// --- PÁGINA PRINCIPAL (FOCO EM CONVITE & EMOÇÃO) ---
export function PublicPageContent({ event, galleryItems }: PublicPageContentProps) {
    const [showEnvelope, setShowEnvelope] = useState(true);
    const [showStories, setShowStories] = useState(false);

    const searchParams = useSearchParams();
    const isSuccess = searchParams.get('success') === 'true';

    const handleEnvelopeSequenceComplete = () => {
        setShowEnvelope(false);
        setTimeout(() => {
           setShowStories(true);
        }, 100); 
    };

    const handleStoriesComplete = () => {
        setShowStories(false);
    };

    if (isSuccess) {
        return <SuccessPage />;
    }

    return (
        <main className="min-h-screen bg-white font-sans overflow-x-hidden">
            <AnimatePresence>
                {showEnvelope && (
                    <OpeningEnvelope key="envelope" onOpenComplete={handleEnvelopeSequenceComplete} />
                )}
            </AnimatePresence>

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
                <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000 relative">
                    {/* Background decorativo sutil */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,228,230,0.5),transparent)] -z-10" />
                    
                    <div className="max-w-2xl w-full space-y-12">
                        {/* HEADER DE BOAS-VINDAS */}
                        <header className="space-y-6">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100"
                            >
                                <Sparkles size={14} fill="currentColor" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Seja Bem-vindo(a)</span>
                            </motion.div>
                            
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-2"
                            >
                                <h1 className="text-4xl md:text-7xl font-black text-gray-900 uppercase tracking-tighter leading-[0.9]">
                                    {event.coupleName}
                                </h1>
                                <p className="text-sm md:text-lg text-rose-500 font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                                    <Calendar size={18} />
                                    {new Date(event.eventDate).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                                </p>
                            </motion.div>
                        </header>

                        {/* MENSAGEM DO CASAL */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white p-10 md:p-14 rounded-[3rem] border border-gray-100 shadow-2xl shadow-rose-100/50 relative overflow-hidden"
                        >
                            <Music className="absolute -top-6 -left-6 text-rose-50 w-32 h-32 -rotate-12" />
                            <div className="relative z-10 space-y-8">
                                <p className="text-lg md:text-2xl text-gray-600 font-medium leading-relaxed italic">
                                    &quot;{event.welcomeMessage || "Sua presença é o nosso maior presente. Estamos ansiosos para celebrar este dia inesquecível ao seu lado!"}&quot;
                                </p>
                                
                                <div className="h-px w-20 bg-rose-200 mx-auto"></div>

                                {/* CTA PARA A LISTA DE PRESENTES (NOVA ROTA) */}
                                <Link href={`/${event.slug}/presentes`} className="block">
                                    <button className="w-full bg-gray-900 hover:bg-rose-600 text-white h-16 md:h-20 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 group">
                                        <span>Ver Lista de Presentes</span>
                                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform">
                                            <ArrowRight size={18} />
                                        </div>
                                    </button>
                                </Link>
                            </div>
                        </motion.div>

                        <footer className="pt-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-300">
                                BemCasadosApp • Design & Emoção
                            </p>
                        </footer>
                    </div>
                </div>
            )}
        </main>
    );
}