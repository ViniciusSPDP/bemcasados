    // src/app/(public)/[slug]/presentes/page.tsx
    import { prisma } from "@/lib/prisma";
    import Image from "next/image";
    import Link from "next/link";
    import { Gift, ArrowLeft, Heart, Sparkles, ShieldCheck } from "lucide-react";
    import { notFound } from "next/navigation";

    export default async function GiftsPage({ params }: { params: Promise<{ slug: string }> }) {
        const { slug } = await params;
        
        const event = await prisma.event.findUnique({
            where: { slug },
            include: { gifts: { orderBy: { price: 'asc' } } }
        });

        if (!event) return notFound();

        const availableGifts = event.gifts.filter(g => g.available || !g.isExclusive).length;

        return (
            <div className="min-h-screen bg-white pb-20 selection:bg-rose-100">
                {/* HEADER FLUTUANTE */}
                <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-rose-50 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Link href={`/${slug}`} className="group flex items-center gap-2 text-gray-400 hover:text-rose-600 transition-all">
                            <div className="p-2 group-hover:bg-rose-50 rounded-full transition-colors">
                                <ArrowLeft size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Voltar ao Convite</span>
                        </Link>
                        
                        <div className="flex flex-col items-center">
                            <Heart size={18} className="text-rose-500 animate-pulse" fill="currentColor" />
                        </div>

                        <div className="flex items-center gap-2 text-emerald-600">
                            <ShieldCheck size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline text-gray-400">Ambiente Seguro</span>
                        </div>
                    </div>
                </header>

                <main>
                    {/* HERO SECTION - O TOPO IMPACTANTE */}
                    <section className="relative bg-rose-600 py-16 md:py-24 overflow-hidden">
                        {/* Elementos Decorativos de Fundo */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-10">
                            <div className="absolute top-10 left-10 rotate-12"><Gift size={120} /></div>
                            <div className="absolute bottom-10 right-10 -rotate-12"><Sparkles size={100} /></div>
                        </div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent)] pointer-events-none" />

                        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md text-white rounded-full border border-white/20">
                                <Sparkles size={14} className="text-rose-200" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Lista de Casamento</span>
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">
                                    Presenteie os <br /> <span className="text-rose-200">Noivos</span>
                                </h2>
                                <p className="text-rose-100 text-sm md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                                    Sua contribuição ajudará {event.coupleName} a construir <br className="hidden md:block" /> 
                                    um novo lar cheio de amor e felicidade.
                                </p>
                            </div>

                            <div className="pt-4 flex items-center justify-center gap-8">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-white leading-none">{availableGifts}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-200 mt-1">Opções Disponíveis</p>
                                </div>
                                <div className="w-px h-8 bg-white/20" />
                                <div className="text-center">
                                    <p className="text-3xl font-black text-white leading-none">100%</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-200 mt-1">Seguro & Digital</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* GRID DE PRESENTES */}
                    <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
                            {event.gifts.map((gift) => {
                                const isSoldOut = !gift.available && gift.isExclusive;
                                return (
                                    <Link 
                                        href={`/${slug}/presentes/${gift.id}`} 
                                        key={gift.id}
                                        className="group flex flex-col bg-white rounded-[2.5rem] border border-gray-100 p-3 md:p-5 transition-all hover:shadow-[0_20px_50px_rgba(225,29,72,0.1)] hover:-translate-y-2"
                                    >
                                        {/* Imagem 1:1 com Overlay */}
                                        <div className="aspect-square relative rounded-[2rem] overflow-hidden bg-gray-50 mb-6">
                                            {gift.imageUrl ? (
                                                <Image 
                                                    src={gift.imageUrl} 
                                                    alt={gift.title} 
                                                    fill
                                                    unoptimized
                                                    className={`object-cover transition-transform duration-1000 group-hover:scale-110 ${isSoldOut ? 'grayscale opacity-50' : ''}`} 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50"><Gift size={40} /></div>
                                            )}
                                            
                                            {/* Status Tag */}
                                            {isSoldOut ? (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                                                    <span className="bg-white text-rose-600 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-tighter shadow-2xl">
                                                        Já Ganharam! 🎁
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                                    <div className="bg-white/90 backdrop-blur-md p-2 rounded-full text-rose-600 shadow-xl">
                                                        <Heart size={16} fill="currentColor" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-3 px-1 flex-1 flex flex-col">
                                            <div className="space-y-1">
                                                <h3 className={`font-black text-gray-900 text-sm md:text-lg line-clamp-2 uppercase tracking-tight leading-[1.1] ${isSoldOut ? 'opacity-30' : ''}`}>
                                                    {gift.title}
                                                </h3>
                                                {!gift.isExclusive && !isSoldOut && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full inline-block">Cota Coletiva</span>
                                                )}
                                            </div>

                                            <div className="mt-auto pt-4 flex items-center justify-between">
                                                <p className={`font-black text-xl md:text-2xl tracking-tighter ${isSoldOut ? 'text-gray-200 line-through' : 'text-rose-600'}`}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(gift.price))}
                                                </p>
                                                
                                                <div className={`p-2 rounded-xl transition-colors ${isSoldOut ? 'bg-gray-50 text-gray-200' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'}`}>
                                                    <ArrowLeft className="rotate-180" size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                </main>

                {/* FOOTER */}
                <footer className="py-20 border-t border-gray-100 text-center space-y-4">
                    <div className="flex items-center justify-center gap-4 grayscale opacity-30">
                        <Image src="https://logospng.org/download/pix/logo-pix-icone-512.png" alt="Pix" width={30} height={30} />
                        <Image src="https://logospng.org/download/mastercard/logo-mastercard-256.png" alt="Master" width={30} height={30} />
                        <Image src="https://logospng.org/download/visa/logo-visa-256.png" alt="Visa" width={30} height={30} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">
                        {event.coupleName} • BemCasadosApp 2026
                    </p>
                </footer>
            </div>
        );
    }