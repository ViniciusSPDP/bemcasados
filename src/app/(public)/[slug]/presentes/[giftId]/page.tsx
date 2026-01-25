// src/app/(public)/[slug]/presente/[giftId]/page.tsx
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Heart, Info, Lock } from "lucide-react";
import { CheckoutButton } from "@/components/public/checkout-button";

export default async function GiftPage({ params }: { params: Promise<{ slug: string, giftId: string }> }) {
    const { slug, giftId } = await params;

    const gift = await prisma.gift.findUnique({
        where: { id: giftId },
        include: { event: true }
    });

    if (!gift || gift.event.slug !== slug) return notFound();

    const isSoldOut = !gift.available && gift.isExclusive;

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-rose-100 selection:text-rose-900">
            {/* HEADER MOBILE FIXO / DESKTOP STICKY */}
            <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-gray-50 px-4 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href={`/${slug}/presentes`} className="group flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <div className="p-2 group-hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Voltar para lista</span>
                    </Link>
                    
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">{gift.event.coupleName}</span>
                    </div>

                    <div className="w-10 h-10 flex items-center justify-center">
                         <Heart size={20} className="text-rose-100" fill="currentColor" />
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-8 md:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                    
                    {/* COLUNA ESQUERDA: IMAGEM 1:1 */}
                    <div className="relative group">
                        <div className="aspect-square relative rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl shadow-rose-100 border border-gray-50 bg-gray-50">
                            {gift.imageUrl ? (
                                <Image 
                                    src={gift.imageUrl} 
                                    alt={gift.title} 
                                    fill 
                                    className={`object-cover transition-transform duration-1000 group-hover:scale-105 ${isSoldOut ? 'grayscale opacity-50' : ''}`}
                                    priority 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 italic">Sem imagem</div>
                            )}
                            
                            {isSoldOut && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                    <span className="bg-rose-600 text-white px-6 py-2 rounded-full font-black uppercase tracking-tighter text-sm shadow-xl">
                                        Já Ganharam! 🎁
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUNA DIREITA: CONTEÚDO */}
                    <div className="flex flex-col h-full space-y-8 md:py-4">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                    <Heart size={12} fill="currentColor" />
                                    <span className="text-[9px] font-black uppercase tracking-wider">Presente para o Casal</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.9] tracking-tighter uppercase">
                                    {gift.title}
                                </h1>
                            </div>

                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-rose-600 tracking-tighter">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(gift.price))}
                                </span>
                                {!gift.isExclusive && <span className="text-gray-400 font-bold text-xs uppercase italic">/ cota coletiva</span>}
                            </div>

                            <div className="h-px w-full bg-gray-100"></div>

                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">
                                    <Info size={14} className="text-rose-400" /> Por que este presente?
                                </h3>
                                <p className="text-gray-600 leading-relaxed text-lg font-medium">
                                    {gift.description || "Escolhemos este item para fazer parte da nossa nova história. Sua contribuição nos ajudará a construir nosso lar com todo carinho."}
                                </p>
                            </div>
                        </div>

                        {/* AÇÃO DE COMPRA */}
                        <div className="pt-6 space-y-6">
                            {isSoldOut ? (
                                <button disabled className="w-full bg-gray-100 text-gray-400 h-16 rounded-2xl font-black uppercase text-sm cursor-not-allowed">
                                    Este presente já foi escolhido
                                </button>
                            ) : (
                                <CheckoutButton gift={gift} />
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-900">Segurança Total</p>
                                        <p className="text-[9px] text-gray-500 font-medium leading-tight">Pagamento processado via SSL criptografado.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <Lock className="text-blue-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-900">Privacidade</p>
                                        <p className="text-[9px] text-gray-500 font-medium leading-tight">Seus dados estão protegidos pela nossa plataforma.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RODAPÉ DA PÁGINA */}
                        <div className="pt-10 flex flex-col items-center gap-4 border-t border-gray-50">
                            <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em] text-center">
                                Plataforma Exclusiva • {gift.event.coupleName}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}