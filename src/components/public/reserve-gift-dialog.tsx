"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { reserveExternalGift } from "@/actions/reservation-actions";
import type { PublicExternalGift } from "@/lib/external-gift";

interface Props {
    gift: PublicExternalGift;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Reserva de um presente da vitrine.
 *
 * A ordem "reservar e depois comprar" é proposital: reduz a janela em que dois
 * convidados compram o mesmo item. Por isso o estado de sucesso já traz o botão
 * para o Mercado Livre.
 */
export function ReserveGiftDialog({ gift, isOpen, onClose }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await reserveExternalGift(formData);
            if (result.success) {
                setDone(true);
            } else {
                setError(result.message ?? "Não foi possível reservar o presente.");
            }
        } catch {
            setError("Erro inesperado. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-white sm:max-w-md">
                {done ? (
                    <div className="text-center py-4 space-y-4">
                        <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
                        <DialogHeader>
                            <DialogTitle className="text-center text-xl">
                                Presente reservado!
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                Agora é só comprar no Mercado Livre. Os noivos já sabem que este
                                presente é seu.
                            </DialogDescription>
                        </DialogHeader>

                        <a
                            href={gift.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow sponsored"
                            className="w-full bg-[#c9a227] text-[#0a1628] font-semibold py-3 rounded-lg hover:bg-[#dcb63a] transition flex items-center justify-center gap-2"
                        >
                            Ir para o Mercado Livre <ExternalLink size={16} />
                        </a>
                        <button
                            onClick={onClose}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Reservar presente</DialogTitle>
                            <DialogDescription>{gift.title}</DialogDescription>
                        </DialogHeader>

                        <form action={handleSubmit} className="space-y-4">
                            <input type="hidden" name="giftId" value={gift.id} />

                            <div>
                                <label htmlFor="reserve-name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Seu nome
                                </label>
                                <input
                                    id="reserve-name"
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Maria Souza"
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9a227] outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="reserve-phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone
                                </label>
                                <input
                                    id="reserve-phone"
                                    name="phone"
                                    required
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="(11) 98765-4321"
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9a227] outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="reserve-message" className="block text-sm font-medium text-gray-700 mb-1">
                                    Mensagem para o casal{" "}
                                    <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    id="reserve-message"
                                    name="message"
                                    rows={3}
                                    placeholder="Felicidades!"
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9a227] outline-none resize-none"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#c9a227] text-[#0a1628] font-semibold py-3 rounded-lg hover:bg-[#dcb63a] transition flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} /> Reservando...
                                    </>
                                ) : (
                                    "Reservar presente"
                                )}
                            </button>

                            <p className="text-xs text-gray-500 leading-relaxed">
                                Seu nome e telefone ficam visíveis <strong>apenas para o casal</strong>,
                                para que eles possam falar com você sobre o presente. Não enviamos
                                nada ao Mercado Livre. Veja a{" "}
                                <Link
                                    href="/politica-de-privacidade"
                                    target="_blank"
                                    className="underline hover:text-gray-700"
                                >
                                    Política de Privacidade
                                </Link>
                                .
                            </p>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
