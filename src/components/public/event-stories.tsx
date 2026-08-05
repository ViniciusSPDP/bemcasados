'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import YouTube, { YouTubePlayer } from 'react-youtube';

export interface StoryItem {
    id: string;
    imageUrl: string;
    caption: string | null;
}

interface EventStoriesProps {
  items: StoryItem[];
  title: string;
  subtitle: string;
  message: string | null;
  videoUrl?: string | null;
  onComplete: () => void;
}

export function EventStories({ items, title, subtitle, message, videoUrl, onComplete }: EventStoriesProps) {
  const [step, setStep] = useState<'intro' | 'slideshow' | 'message'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep('message');
    }
  };

  const getVideoId = (url: string | null | undefined) => {
    try {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    } catch  {
        return null;
    }
  };

  const videoId = getVideoId(videoUrl);

  const startExperience = () => {
    setStep('slideshow');
    if (player) {
        player.unMute();
        player.setVolume(100);
        player.playVideo();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!player) return;
    if (isMuted) {
        player.unMute(); setIsMuted(false);
    } else {
        player.mute(); setIsMuted(true);
    }
  };

  useEffect(() => {
    if (step === 'slideshow') {
      const timer = setTimeout(() => {
        handleNext();
      }, 5000); 
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentIndex, items.length]);

  const currentItem = items[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Player do Youtube Escondido (para áudio) */}
      {videoId && (
        <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
             <YouTube
                videoId={videoId}
                opts={{ height: '100', width: '100', playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: videoId } }}
                onReady={(event) => setPlayer(event.target)}
            />
        </div>
      )}

      {/* Botão de Mute */}
      {videoId && step !== 'intro' && (
        <button onClick={toggleMute} className="absolute top-4 right-4 z-50 bg-black/40 p-3 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10">
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      )}
      
      <AnimatePresence mode="wait">
        
        {/* --- TELA 1: INTRO (TÍTULO DO EVENTO) --- */}
        {step === 'intro' && (
          <motion.div 
            key="intro-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            className="flex flex-col items-center justify-center p-4 w-full h-full relative z-10"
          >
            {/* Efeito de luz de fundo para destacar o texto */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[50%] bg-rose-900/20 blur-[100px] pointer-events-none" />

            <div className="space-y-6 text-center max-w-full w-full">
                <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                    // AQUI ESTÁ A CORREÇÃO PRINCIPAL:
                    // text-4xl no mobile (menor para caber), break-words (quebra linha), leading-tight (linhas juntas)
                    className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-linear-to-br from-rose-200 via-rose-500 to-orange-400 drop-shadow-sm wrap-break-word px-2 leading-tight"
                >
                    {title}
                </motion.h1>
                
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-16 h-1 bg-linear-to-r from-transparent via-rose-500 to-transparent mx-auto rounded-full"
                />

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-lg md:text-2xl font-serif italic text-rose-100/80 tracking-wide px-4 max-w-lg mx-auto"
                >
                    {subtitle}
                </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, type: "spring", bounce: 0.4 }}
              className="mt-12 w-full max-w-xs px-4"
            >
              <Button 
                onClick={startExperience}
                className="w-full bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-400/30 transition-all hover:scale-105"
              >
                COMEÇAR HISTÓRIA
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* --- TELA 2: SLIDESHOW (STORIES) --- */}
        {step === 'slideshow' && items.length > 0 && currentItem && (
          <motion.div 
            key={`slide-${currentIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-pointer bg-gray-900"
            onClick={handleNext}
          >
            {/* Imagem */}
            <div className="absolute inset-0">
               <Image 
                 src={currentItem.imageUrl} 
                 alt={`Slide ${currentIndex}`} 
                 fill
                 className="object-cover"
                 priority
               />
            </div>

            {/* Degradê inferior para legibilidade do texto */}
            <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-linear-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-6 md:p-12 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="w-full mx-auto text-center space-y-6 pb-8"
                >
                    {/* Barra de Progresso */}
                    <div className="flex gap-1.5 mb-2 justify-center w-full max-w-md mx-auto">
                        {items.map((_, idx) => (
                            <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                <motion.div 
                                    initial={{ width: "0%" }}
                                    animate={{ width: idx === currentIndex ? "100%" : idx < currentIndex ? "100%" : "0%" }}
                                    transition={{ duration: idx === currentIndex ? 5 : 0, ease: "linear" }}
                                    className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                                />
                            </div>
                        ))}
                    </div>
                    
                    {/* Legenda da Foto */}
                    {currentItem.caption && (
                        <p className="text-xl md:text-3xl font-bold text-white leading-snug drop-shadow-lg max-w-2xl mx-auto wrap-break-word">
                            {currentItem.caption}
                        </p>
                    )}
                </motion.div>
            </div>

            <Button 
                variant="ghost" 
                className="absolute bottom-6 right-4 text-white/70 hover:text-white hover:bg-white/10 z-20 pointer-events-auto text-xs uppercase tracking-widest"
                onClick={(e) => {
                    e.stopPropagation();
                    setStep('message');
                }}
            >
                Pular <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* --- TELA 3: MENSAGEM FINAL (RECADO DOS NOIVOS) --- */}
        {step === 'message' && (
          <motion.div 
            key="message-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 p-6 w-full max-w-lg mx-auto"
          >
             <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-rose-500/30 p-8 md:p-10 shadow-2xl relative overflow-hidden">
                {/* Efeito decorativo de fundo */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>

                <div className="text-center space-y-6 relative z-10">
                    <h2 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-rose-200 to-orange-100 font-serif">
                        Recado dos Noivos
                    </h2>
                    
                    <div className="max-h-[40vh] overflow-y-auto pr-2 text-rose-50/90 leading-relaxed whitespace-pre-wrap font-medium text-base md:text-lg italic scrollbar-thin scrollbar-thumb-rose-500/50 scrollbar-track-transparent">
                        {message || "Agradecemos por fazer parte da nossa história! Sua presença é o nosso maior presente."}
                    </div>
                    
                    <div className="pt-4">
                        <Button 
                            onClick={() => {
                                if (player) player.pauseVideo();
                                onComplete();
                            }}
                            className="w-full bg-linear-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-bold h-14 text-lg rounded-xl shadow-lg transform transition hover:scale-[1.02] border border-white/10"
                        >
                            VER LISTA DE PRESENTES
                        </Button>
                    </div>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}