// src/app/(public)/[slug]/sucesso/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import confetti from 'canvas-confetti'
import { CheckCircle, Heart, Share2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SuccessPage() {
  const { slug } = useParams()

  useEffect(() => {
    // Dispara o confete assim que a página carrega
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    // Tipagem correta para evitar o "any"
    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now()
      
      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({ 
        ...defaults, 
        particleCount, 
        origin: { x: Math.random(), y: Math.random() - 0.2 } 
      })
    }, 250)

    // IMPORTANTE: Limpar o intervalo ao desmontar o componente
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-rose-50/30 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-rose-100 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle size={40} />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Obrigado!</h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            Seu presente foi enviado com sucesso. Os noivos ficarão imensamente felizes com seu carinho!
          </p>
        </div>

        <div className="bg-rose-50 p-4 rounded-2xl flex items-center gap-3 text-rose-700">
          <Heart className="shrink-0" fill="currentColor" size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">
            Você acabou de tornar o grande dia deles ainda mais especial.
          </span>
        </div>

        <div className="pt-4 space-y-3">
          <Link href={`/${slug}`}>
            <Button variant="outline" className="w-full rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 gap-2 h-14 font-bold shadow-sm transition-all active:scale-95">
              <Home size={18} /> Voltar para o Site
            </Button>
          </Link>
          
          <Button 
            variant="ghost" 
            className="w-full text-gray-400 text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-transparent hover:text-gray-600"
            onClick={() => {
                if (navigator.share) {
                    navigator.share({ title: 'Presente Enviado!', url: window.location.href }).catch(() => null)
                }
            }}
          >
            <Share2 size={14} /> Compartilhar alegria
          </Button>
        </div>
      </div>
    </div>
  )
}