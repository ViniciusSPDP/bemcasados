'use client'

import { signup } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useActionState } from "react"
// 1. IMPORTANTE: Importar "Variants" aqui para corrigir o erro de tipo
import { motion, Variants } from "framer-motion" 
import { User, Mail, Lock, Heart, Calendar, Link as LinkIcon, Sparkles } from "lucide-react" 

export default function RegisterPage() {
    const [state, action, isPending] = useActionState(signup, undefined)

    // 2. CORREÇÃO: Tipar explicitamente como "Variants"
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

    // 3. CORREÇÃO: Tipar explicitamente como "Variants"
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
            
            {/* Elementos decorativos de fundo */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-rose-300/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-orange-200/20 rounded-full blur-3xl" />
            </div>

            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative z-10"
            >
                <div className="text-center mb-8">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
                    >
                        <Heart fill="currentColor" size={32} />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-900 font-serif tracking-tight">Crie seu Evento</h2>
                    <p className="mt-2 text-gray-500 text-sm">Comece sua lista de presentes e realize sonhos</p>
                </div>

                <form action={action}>
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-5"
                    >
                        {/* --- BLOCO 1: DADOS DO CASAL --- */}
                        <motion.div variants={itemVariants}>
                            <Label htmlFor="name" className="text-gray-700 font-medium ml-1">Nome do Casal</Label>
                            <div className="relative mt-1.5">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input 
                                    id="name" 
                                    name="name" 
                                    placeholder="Ex: Ana e Pedro" 
                                    className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>
                            {state?.error?.name && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{state.error.name}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Label htmlFor="email" className="text-gray-700 font-medium ml-1">Email</Label>
                            <div className="relative mt-1.5">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    placeholder="email@exemplo.com" 
                                    className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>
                            {state?.error?.email && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{state.error.email}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Label htmlFor="password" className="text-gray-700 font-medium ml-1">Senha</Label>
                            <div className="relative mt-1.5">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input 
                                    id="password" 
                                    name="password" 
                                    type="password" 
                                    placeholder="••••••••"
                                    className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>
                            {state?.error?.password && (
                                <div className="text-xs text-rose-500 mt-1 ml-1 font-medium">
                                    <ul>
                                        {state.error.password.map((error) => (
                                            <li key={error}>- {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </motion.div>

                        {/* --- DIVISOR ESTILIZADO --- */}
                        <motion.div variants={itemVariants} className="relative flex py-4 items-center">
                            <div className="grow border-t border-gray-200"></div>
                            <span className="shrink-0 mx-4 text-rose-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">
                                <Sparkles size={10} /> Dados do Evento
                            </span>
                            <div className="grow border-t border-gray-200"></div>
                        </motion.div>

                        {/* --- BLOCO 2: DADOS DO EVENTO --- */}
                        <motion.div variants={itemVariants}>
                            <Label htmlFor="eventName" className="text-gray-700 font-medium ml-1">Nome do Evento</Label>
                            <div className="relative mt-1.5">
                                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input 
                                    id="eventName" 
                                    name="eventName" 
                                    placeholder="Casamento Ana e Pedro" 
                                    className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>
                            {state?.error?.eventName && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{state.error.eventName}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Label htmlFor="slug" className="text-gray-700 font-medium ml-1">Link Personalizado</Label>
                            <div className="relative mt-1.5 flex shadow-sm rounded-xl">
                                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 text-gray-500 text-sm">
                                    <LinkIcon size={14} className="mr-1"/> /
                                </span>
                                <Input 
                                    id="slug" 
                                    name="slug" 
                                    placeholder="ana-e-pedro" 
                                    className="rounded-l-none rounded-r-xl h-12 border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-white"
                                />
                            </div>
                            {state?.error?.slug && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{state.error.slug}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Label htmlFor="eventDate" className="text-gray-700 font-medium ml-1">Data do Casamento</Label>
                            <div className="relative mt-1.5">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input 
                                    id="eventDate" 
                                    name="eventDate" 
                                    type="date" 
                                    className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-rose-500 focus-visible:border-rose-500 bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>
                            {state?.error?.eventDate && <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">{state.error.eventDate}</p>}
                        </motion.div>

                        {/* --- MENSAGENS GERAIS --- */}
                        {state?.message && (
                            <motion.div variants={itemVariants} className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                <p className="text-sm text-rose-700 font-medium">{state.message}</p>
                            </motion.div>
                        )}

                        {/* --- BOTÃO DE AÇÃO --- */}
                        <motion.div variants={itemVariants} className="pt-2">
                            <Button 
                                disabled={isPending} 
                                type="submit" 
                                className="w-full h-14 text-lg font-bold rounded-xl bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isPending ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Criando conta...
                                    </span>
                                ) : 'Criar Evento Grátis'}
                            </Button>
                        </motion.div>

                        <motion.p variants={itemVariants} className="text-center text-sm text-gray-500 pt-4">
                            Já tem uma conta?{' '}
                            <Link href="/login" className="font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all">
                                Entrar
                            </Link>
                        </motion.p>
                    </motion.div>
                </form>
            </motion.div>
        </div>
    )
}