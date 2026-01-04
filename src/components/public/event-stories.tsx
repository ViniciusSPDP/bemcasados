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
      
      {videoId && (
        <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
             <YouTube
                videoId={videoId}
                opts={{ height: '100', width: '100', playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: videoId } }}
                onReady={(event) => setPlayer(event.target)}
            />
        </div>
      )}

      {videoId && step !== 'intro' && (
        <button onClick={toggleMute} className="absolute top-4 right-4 z-50 bg-black/40 p-3 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10">
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      )}
      
      <AnimatePresence>
        {step === 'intro' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center p-6 space-y-8 max-w-md w-full relative z-10"
          >
            <div className="space-y-2">
                <motion.h1 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
                className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-rose-300 via-rose-500 to-orange-400 drop-shadow-sm"
                >
                {title.toUpperCase()}
                </motion.h1>
                
                <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xl md:text-2xl font-medium text-rose-100/90 tracking-tight"
                >
                {subtitle}
                </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring", bounce: 0.4 }}
            >
              <Button 
                onClick={startExperience}
                size="lg" 
                className="w-full bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold text-xl rounded-2xl h-16 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.5)] border-t border-white/20"
              >
                ABRIR CONVITE
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'slideshow' && items.length > 0 && currentItem && (
          <motion.div 
            key={`slide-${currentIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-pointer"
            onClick={handleNext}
          >
            <div className="absolute inset-0">
               <Image 
                 src={currentItem.imageUrl} 
                 alt={`Slide ${currentIndex}`} 
                 fill 
                 className="object-cover"
                 unoptimized
                 priority
               />
            </div>

            {/* --- CORREÇÃO DO DEGRADÊ AQUI --- */}
            {/* Alterado de 'inset-0' para 'bottom-0 h-[65%]' para não cobrir o rosto */}
            <div className="absolute bottom-0 left-0 right-0 h-[65%] bg-linear-to-t from-rose-950/95 via-rose-900/50 to-transparent flex flex-col justify-end p-8 md:p-12 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="max-w-2xl mx-auto text-center space-y-4"
                >
                    <div className="flex gap-1 mb-6 justify-center">
                        {items.map((_, idx) => (
                            <div key={idx} className="h-1 w-8 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                            <motion.div 
                                initial={{ width: "0%" }}
                                animate={{ width: idx === currentIndex ? "100%" : idx < currentIndex ? "100%" : "0%" }}
                                transition={{ duration: idx === currentIndex ? 5 : 0, ease: "linear" }}
                                className="h-full bg-white/90 box-shadow-[0_0_10px_white]"
                            />
                            </div>
                        ))}
                    </div>
                    
                    {currentItem.caption && (
                        <p className="text-xl md:text-3xl font-bold text-white leading-tight drop-shadow-lg pb-4">
                            {currentItem.caption}
                        </p>
                    )}
                </motion.div>
            </div>

            <Button 
                variant="ghost" 
                className="absolute bottom-8 right-4 text-white/80 hover:text-white hover:bg-white/10 z-20 pointer-events-auto"
                onClick={(e) => {
                    e.stopPropagation();
                    setStep('message');
                }}
            >
                Pular <ChevronRight size={24} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === 'message' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 p-8 md:p-10 max-w-lg w-full bg-rose-950/40 backdrop-blur-xl rounded-[2rem] border border-rose-200/20 mx-4 shadow-2xl"
          >
            <div className="text-center space-y-8">
               <h2 className="text-3xl md:text-4xl font-bold text-rose-100 drop-shadow-sm font-serif">Recado dos Noivos</h2>
               
               <div className="max-h-[40vh] overflow-y-auto text-rose-50/90 leading-relaxed whitespace-pre-wrap font-medium text-lg md:text-xl scrollbar-hide italic">
                 {message || "Agradecemos por fazer parte da nossa história! Sua presença é o nosso maior presente."}
               </div>
               
               <Button 
                 onClick={() => {
                    if (player) player.pauseVideo();
                    onComplete();
                 }}
                 className="w-full bg-linear-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-bold h-14 text-xl rounded-2xl shadow-lg shadow-rose-900/20 transform transition hover:scale-[1.02] border-t border-white/20"
               >
                 VER LISTA DE PRESENTES
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}