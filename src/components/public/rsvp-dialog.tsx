"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Plus, X, HeartHandshake, HeartCrack } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { submitRsvp } from "@/actions/rsvp-actions";
import { MAX_COMPANIONS } from "@/lib/definitions";

interface Props {
    slug: string;
    isOpen: boolean;
    onClose: () => void;
}

type Status = "SIM" | "NAO";

/**
 * Confirmação de presença.
 *
 * Mesma estrutura do diálogo de reserva da vitrine — estados de envio, erro e
 * sucesso, cartão branco com o dourado do convite —, porque o convidado chega
 * aqui pelo mesmo convite e a troca de linguagem visual pareceria outro site.
 *
 * A resposta anterior **não** é pré-carregada. Buscá-la exigiria um endereço
 * anônimo que devolvesse a confirmação a partir de um telefone, e isso seria um
 * oráculo: qualquer pessoa descobriria quem foi ao casamento e com quem.
 */
export function RsvpDialog({ slug, isOpen, onClose }: Props) {
    const [status, setStatus] = useState<Status | null>(null);
    // Um campo por acompanhante. O estado guarda os valores para o botão de
    // remover tirar a pessoa certa, e não sempre a última.
    const [companions, setCompanions] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ updated: boolean } | null>(null);

    function reset() {
        setStatus(null);
        setCompanions([]);
        setError(null);
        setDone(null);
    }

    function handleClose() {
        onClose();
        // Espera a animação de saída para o formulário não piscar vazio na tela.
        setTimeout(reset, 200);
    }

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await submitRsvp(formData);
            if (result.success) {
                setDone({ updated: result.updated === true });
            } else {
                setError(result.message ?? "Não foi possível enviar sua confirmação.");
            }
        } catch {
            setError("Erro inesperado. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="bg-white sm:max-w-md max-h-[90vh] overflow-y-auto">
                {done ? (
                    <div className="text-center py-4 space-y-4">
                        <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
                        <DialogHeader>
                            <DialogTitle className="text-center text-xl">
                                {done.updated
                                    ? "Atualizamos a sua confirmação"
                                    : status === "SIM"
                                      ? "Presença confirmada!"
                                      : "Obrigado por avisar"}
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                {status === "SIM"
                                    ? "O casal já sabe que você vai. Se algo mudar, é só responder de novo com o mesmo telefone."
                                    : "O casal foi avisado de que você não poderá ir. Se mudar de ideia, responda de novo com o mesmo telefone."}
                            </DialogDescription>
                        </DialogHeader>

                        <button
                            onClick={handleClose}
                            className="w-full bg-[#c9a227] text-[#0a1628] font-semibold py-3 rounded-lg hover:bg-[#dcb63a] transition"
                        >
                            Voltar ao convite
                        </button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Confirmar presença</DialogTitle>
                            <DialogDescription>
                                Responda mesmo que não possa ir — assim o casal sabe com quem contar.
                            </DialogDescription>
                        </DialogHeader>

                        <form action={handleSubmit} className="space-y-4">
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="status" value={status ?? ""} />

                            {/* Dois botões grandes, e não um <select>: a escolha é
                                a pergunta principal da tela, e no celular um
                                seletor esconderia isso atrás de um toque. */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStatus("SIM")}
                                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 transition ${
                                        status === "SIM"
                                            ? "border-[#c9a227] bg-[#c9a227]/10 text-[#0a1628]"
                                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                                    }`}
                                >
                                    <HeartHandshake size={24} />
                                    <span className="font-semibold text-sm">Vou</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus("NAO")}
                                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 transition ${
                                        status === "NAO"
                                            ? "border-gray-400 bg-gray-100 text-gray-800"
                                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                                    }`}
                                >
                                    <HeartCrack size={24} />
                                    <span className="font-semibold text-sm">Não vou</span>
                                </button>
                            </div>

                            <div>
                                <label htmlFor="rsvp-name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Seu nome
                                </label>
                                <input
                                    id="rsvp-name"
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Maria Souza"
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9a227] outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="rsvp-phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone
                                </label>
                                <input
                                    id="rsvp-phone"
                                    name="phone"
                                    required
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="(11) 98765-4321"
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9a227] outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    É por ele que reconhecemos a sua resposta se você precisar mudá-la.
                                </p>
                            </div>

                            {/* Quem não vai não vê campo de acompanhante. */}
                            {status === "SIM" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Acompanhantes{" "}
                                        <span className="text-gray-400 font-normal">(opcional)</span>
                                    </label>

                                    {companions.length > 0 && (
                                        <div className="space-y-2 mb-2">
                                            {companions.map((value, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        name="companion"
                                                        value={value}
                                                        onChange={(e) =>
                                                            setCompanions((list) =>
                                                                list.map((v, i) =>
                                                                    i === index ? e.target.value : v
                                                                )
                                                            )
                                                        }
                                                        placeholder={`Nome do ${index + 1}º acompanhante`}
                                                        className="flex-1 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9a227] outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCompanions((list) =>
                                                                list.filter((_, i) => i !== index)
                                                            )
                                                        }
                                                        aria-label={`Remover ${index + 1}º acompanhante`}
                                                        className="px-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {companions.length < MAX_COMPANIONS ? (
                                        <button
                                            type="button"
                                            onClick={() => setCompanions((list) => [...list, ""])}
                                            className="text-sm text-[#0a1628] border border-dashed border-gray-300 rounded-lg w-full py-2.5 hover:border-[#c9a227] hover:bg-[#c9a227]/5 transition flex items-center justify-center gap-1.5"
                                        >
                                            <Plus size={15} /> Adicionar acompanhante
                                        </button>
                                    ) : (
                                        <p className="text-xs text-gray-500">
                                            Máximo de {MAX_COMPANIONS} acompanhantes. Fale com o casal se
                                            precisar de mais.
                                        </p>
                                    )}

                                    {/*
                                      O link do convite é um só, igual para todo
                                      mundo. Sem este aviso o acompanhante
                                      recebe o mesmo link, confirma por conta
                                      própria e passa a ser contado duas vezes —
                                      uma como acompanhante, outra como
                                      convidado. É a dúvida que qualquer um tem
                                      ao preencher, e ela precisa ser respondida
                                      aqui, não depois.
                                    */}
                                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                        Inclua todos que vêm com você. Quem for incluído aqui{" "}
                                        <strong className="text-gray-700">
                                            não precisa confirmar de novo
                                        </strong>{" "}
                                        — já está contado. O casal usa os nomes para organizar
                                        as mesas.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="rsvp-message" className="block text-sm font-medium text-gray-700 mb-1">
                                    Recado para o casal{" "}
                                    <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    id="rsvp-message"
                                    name="message"
                                    rows={3}
                                    placeholder={
                                        status === "NAO"
                                            ? "Não vou conseguir ir, mas desejo tudo de bom!"
                                            : "Mal posso esperar!"
                                    }
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
                                disabled={isSubmitting || status === null}
                                className="w-full bg-[#c9a227] text-[#0a1628] font-semibold py-3 rounded-lg hover:bg-[#dcb63a] transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} /> Enviando...
                                    </>
                                ) : status === null ? (
                                    "Escolha uma opção acima"
                                ) : (
                                    "Enviar resposta"
                                )}
                            </button>

                            <p className="text-xs text-gray-500 leading-relaxed">
                                Seu nome, telefone e o nome de quem vier com você ficam visíveis{" "}
                                <strong>apenas para o casal</strong>, para organizar a festa. Nenhum
                                outro convidado vê quem confirmou. Veja a{" "}
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
