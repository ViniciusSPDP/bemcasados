'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import YouTube, { YouTubePlayer } from 'react-youtube';

interface EventStoriesProps {
  images: string[];
  title: string;
  subtitle: string;
  message: string | null;
  videoUrl?: string | null;
  onComplete: () => void;
}

export function EventStories({ images, title, subtitle, message, videoUrl, onComplete }: EventStoriesProps) {
  const [step, setStep] = useState<'intro' | 'slideshow' | 'message'>('intro');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Controle do Player
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Extrair ID do Youtube (suporta music.youtube, youtu.be, etc)
  const getVideoId = (url: string) => {
    try {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    } catch (e) {
        return null;
    }
  };

  const videoId = videoUrl ? getVideoId(videoUrl) : null;

  // Handler para iniciar a experiência
  const startExperience = () => {
    setStep('slideshow');
    setIsPlaying(true);
    
    // Tenta dar play no vídeo
    if (player) {
        player.unMute(); // Garante que começa com som
        player.setVolume(100);
        player.playVideo();
    }
  };

  // Controle de Mute manual
  const toggleMute = () => {
    if (!player) return;
    if (isMuted) {
        player.unMute();
        setIsMuted(false);
    } else {
        player.mute();
        setIsMuted(true);
    }
  };

  // Timer do Slideshow
  useEffect(() => {
    if (step === 'slideshow') {
      const timer = setTimeout(() => {
        if (currentImageIndex < images.length - 1) {
          setCurrentImageIndex((prev) => prev + 1);
        } else {
          setStep('message');
        }
      }, 4000); // 4 segundos por foto
      return () => clearTimeout(timer);
    }
  }, [step, currentImageIndex, images.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      
      {/* PLAYER DO YOUTUBE OCULTO */}
      {videoId && (
        <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
             <YouTube
                videoId={videoId}
                opts={{
                    height: '100',
                    width: '100',
                    playerVars: {
                        autoplay: 0,
                        controls: 0,
                        loop: 1,
                        playlist: videoId // Necessário para loop funcionar
                    },
                }}
                onReady={(event) => {
                    setPlayer(event.target);
                    // Opcional: já deixar bufferizado
                    // event.target.mute(); 
                    // event.target.playVideo(); // Hack para carregar
                    // setTimeout(() => event.target.pauseVideo(), 1000);
                }}
            />
        </div>
      )}

      {/* CONTROLE DE VOLUME (SÓ APARECE SE TIVER MÚSICA) */}
      {videoId && step !== 'intro' && (
        <button 
            onClick={toggleMute}
            className="absolute top-4 right-4 z-50 bg-black/50 p-3 rounded-full hover:bg-black/70 transition backdrop-blur-sm"
        >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      )}
      
      {/* 1. INTRODUÇÃO */}
      <AnimatePresence>
        {step === 'intro' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="text-center p-6 space-y-6 max-w-md w-full relative z-10"
          >
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300"
            >
              {title.toUpperCase()}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-xl font-medium text-gray-300"
            >
              {subtitle}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: "spring" }}
            >
              <Button 
                onClick={startExperience}
                size="lg" 
                className="w-full bg-white text-black hover:bg-gray-200 font-bold text-lg rounded-full h-14 shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse"
              >
                ABRIR CONVITE
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. SLIDESHOW */}
      <AnimatePresence mode="wait">
        {step === 'slideshow' && images.length > 0 && (
          <motion.div 
            key="slideshow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Imagem de Fundo (Blur) */}
            <div className="absolute inset-0 opacity-40 blur-2xl scale-110">
               <Image 
                 src={images[currentImageIndex]} 
                 alt="Background" 
                 fill 
                 className="object-cover"
                 unoptimized
                 priority
               />
            </div>

            {/* Imagem Principal */}
            <motion.div 
              key={currentImageIndex}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative w-full h-full md:max-w-md mx-auto flex items-center justify-center p-4"
            >
                <div className="relative w-full aspect-[3/4] shadow-2xl rounded-xl overflow-hidden border-4 border-white/10">
                    <Image 
                    src={images[currentImageIndex]} 
                    alt={`Slide ${currentImageIndex}`}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                    />
                </div>
            </motion.div>

            {/* Barra de Progresso */}
            <div className="absolute top-4 left-4 right-16 flex gap-1 z-10 md:max-w-md mx-auto">
              {images.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: idx === currentImageIndex ? "100%" : idx < currentImageIndex ? "100%" : "0%" }}
                    transition={{ duration: idx === currentImageIndex ? 4 : 0, ease: "linear" }}
                    className="h-full bg-white"
                  />
                </div>
              ))}
            </div>

            <Button 
                variant="ghost" 
                className="absolute bottom-10 right-4 text-white hover:bg-white/20 z-20"
                onClick={() => setStep('message')}
            >
                Pular <ChevronRight size={20} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MENSAGEM FINAL */}
      <AnimatePresence>
        {step === 'message' && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 p-8 max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 mx-4 shadow-2xl"
          >
            <div className="text-center space-y-6">
               <h2 className="text-3xl font-bold text-white drop-shadow-md">Recado dos Noivos</h2>
               
               <div className="max-h-60 overflow-y-auto text-gray-100 leading-relaxed whitespace-pre-wrap font-medium text-lg scrollbar-hide">
                 {message || "Agradecemos por fazer parte da nossa história! Sua presença é o nosso maior presente."}
               </div>
               
               <Button 
                 onClick={() => {
                    // Pausa a música ao sair
                    if (player) player.pauseVideo();
                    onComplete();
                 }}
                 className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold h-14 text-lg rounded-xl shadow-lg shadow-rose-500/30 transform transition hover:scale-105"
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