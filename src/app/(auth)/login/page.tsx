'use client'

import { loginAction } from '@/actions/auth'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
// 1. Importando motion e Variants para animação sem erros de tipo
import { motion, Variants } from 'framer-motion'
import { Mail, Lock, Heart, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, undefined)

  // 2. Definição correta dos tipos Variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { 
            staggerChildren: 0.1, 
            delayChildren: 0.2 
        }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
        y: 0, 
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-rose-100 via-gray-50 to-rose-50 p-4 font-sans">
      
      {/* Elementos decorativos de fundo (Blobs) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-rose-300/20 rounded-full blur-3xl" />
         <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative z-10"
      >
        
        <div className="text-center mb-8">
          <motion.div 
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
             className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
          >
             <Heart fill="currentColor" size={28} />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-serif tracking-tight">Bem-vindo de volta!</h2>
          <p className="mt-2 text-sm text-gray-500">Acesse o painel do seu casamento</p>
        </div>

        <form action={action}>
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible"
            className="space-y-5"
          >
            
            {/* Campo Email */}
            <motion.div variants={itemVariants}>
              <Label htmlFor="email" className="text-gray-700 font-medium ml-1">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  autoComplete="email"
                  className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-gray-50/50 hover:bg-white transition-colors"
                />
              </div>
              {state?.error?.email && (
                <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{state.error.email}</p>
              )}
            </motion.div>

            {/* Campo Senha */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-gray-700 font-medium">Senha</Label>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-gray-50/50 hover:bg-white transition-colors"
                />
              </div>
              {state?.error?.password && (
                <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{state.error.password}</p>
              )}
            </motion.div>

            {/* Mensagem de Erro Geral */}
            {state?.message && (
               <motion.div variants={itemVariants} className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>
                  <p className="text-sm text-rose-700 font-medium">
                    {state.message}
                  </p>
               </motion.div>
            )}

            {/* Botão de Entrar */}
            <motion.div variants={itemVariants} className="pt-2">
                <Button 
                    disabled={isPending} 
                    type="submit" 
                    className="w-full h-14 text-lg font-bold rounded-xl bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isPending ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin h-5 w-5" />
                            Entrando...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            Entrar <ArrowRight size={18} className="opacity-80" />
                        </span>
                    )}
                </Button>
            </motion.div>

            {/* Footer */}
            <motion.p variants={itemVariants} className="text-center text-sm text-gray-500 pt-4">
              Ainda não tem um evento?{' '}
              <Link href="/register" className="font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all">
                Criar conta grátis
              </Link>
            </motion.p>

          </motion.div>
        </form>
      </motion.div>
    </div>
  )
}