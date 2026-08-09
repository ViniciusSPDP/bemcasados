"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, ExternalLink, Check, Heart } from "lucide-react";
import type { PublicExternalGift } from "@/lib/external-gift";
import { ReserveGiftDialog } from "@/components/public/reserve-gift-dialog";
import { colorSwatch, colorLabel } from "@/lib/color-tag";

/**
 * "● BEGE" sobre a foto do produto.
 *
 * A bolinha é reforço; quem carrega a informação é o NOME. Cor que não
 * reconhecemos vira chip neutro em vez de um tom inventado — o convidado
 * confiaria na bolinha, e errar aqui é pior do que não ter bolinha nenhuma.
 *
 * O anel claro em volta existe para "branco" e "off-white" não sumirem contra o
 * fundo escuro da etiqueta.
 */
function ColorTag({ name }: { name: string }) {
    const { hex, isLight } = colorSwatch(name);

    return (
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#0a1628]/85 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white shadow-sm ring-1 ring-white/20">
            <span
                aria-hidden
                className={`h-3 w-3 shrink-0 rounded-full ${isLight ? "ring-1 ring-black/25" : "ring-1 ring-white/30"}`}
                style={{ backgroundColor: hex }}
            />
            {colorLabel(name)}
        </span>
    );
}

export function VitrineContent({ gifts }: { gifts: PublicExternalGift[] }) {
    const [selected, setSelected] = useState<PublicExternalGift | null>(null);

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gifts.map((gift) => (
                    <article
                        key={gift.id}
                        className={`bg-[#0a1628] rounded-2xl border border-[#c9a227]/25 overflow-hidden flex flex-col transition hover:border-[#c9a227]/50 ${
                            gift.isReserved ? "opacity-60" : ""
                        }`}
                    >
                        <div className="relative aspect-video bg-[#132743]">
                            {gift.imageUrl ? (
                                <Image
                                    src={gift.imageUrl}
                                    alt={gift.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingBag className="text-[#c9a227]/30" size={36} />
                                </div>
                            )}

                            {/* Etiqueta de cor sobre a foto, no canto oposto ao
                                "Reservado" para as duas nunca se cobrirem.

                                Fica AQUI, e não junto do título, porque é onde o
                                convidado olha antes de tocar em "Comprar" — que é
                                o momento exato em que ele erraria a variação do
                                anúncio. */}
                            {gift.colorTag && <ColorTag name={gift.colorTag} />}

                            {gift.isReserved && (
                                <span className="absolute top-3 right-3 bg-[#c9a227] text-[#0a1628] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <Check size={13} /> Reservado
                                </span>
                            )}
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                            <h2 className="font-semibold text-white line-clamp-2">{gift.title}</h2>

                            {/* Texto simples: nada vindo do Mercado Livre é injetado como HTML. */}
                            {gift.description && (
                                <p className="text-sm text-slate-400 mt-1.5 line-clamp-3">
                                    {gift.description}
                                </p>
                            )}

                            <div className="mt-auto pt-4 border-t border-[#c9a227]/20 space-y-2">
                                <a
                                    href={gift.shortUrl}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow sponsored"
                                    className="w-full bg-[#c9a227] text-[#0a1628] font-semibold py-2.5 rounded-lg hover:bg-[#dcb63a] transition flex items-center justify-center gap-2 text-sm"
                                >
                                    Comprar no Mercado Livre <ExternalLink size={15} />
                                </a>

                                {gift.isReserved ? (
                                    <p className="text-center text-xs text-slate-500 py-2">
                                        Já reservado por outro convidado
                                    </p>
                                ) : (
                                    <button
                                        onClick={() => setSelected(gift)}
                                        className="w-full border border-[#c9a227]/50 text-[#c9a227] font-medium py-2.5 rounded-lg hover:bg-[#c9a227]/10 transition flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Heart size={15} /> Quero dar este presente
                                    </button>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {selected && (
                <ReserveGiftDialog
                    gift={selected}
                    isOpen={!!selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
}
