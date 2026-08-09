"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Trash2, Loader2, ExternalLink, Phone, AlertTriangle } from "lucide-react";
import {
    deleteExternalGift,
    releaseExternalGiftReservation,
    deleteAllExternalGifts,
} from "@/actions/external-gift-actions";
import { formatPhone } from "@/lib/phone";

export interface AdminExternalGift {
    id: string;
    title: string;
    imageUrl: string | null;
    shortUrl: string;
    reservedAt: Date | null;
    reservedName: string | null;
    reservedPhone: string | null;
    reservedMessage: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function ExternalGiftAdminList({ items }: { items: AdminExternalGift[] }) {
    if (items.length === 0) {
        return (
            <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
                <ShoppingBag className="mx-auto text-gray-300" size={40} />
                <p className="mt-3 text-gray-500">
                    Nenhum item na vitrine ainda. Cole um link do Mercado Livre ao lado.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {items.map((item) => (
                    <ExternalGiftRow key={item.id} item={item} />
                ))}
            </div>

            <DeleteAllButton
                total={items.length}
                reserved={items.filter((i) => i.reservedAt !== null).length}
            />
        </div>
    );
}

/**
 * Esvaziar a vitrine apaga junto as reservas dos convidados, e não tem desfazer.
 * Por isso a confirmação diz o número exato do que será perdido, em vez de um
 * "tem certeza?" genérico que ninguém lê.
 */
function DeleteAllButton({ total, reserved }: { total: number; reserved: number }) {
    const [confirming, setConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDeleteAll() {
        setIsDeleting(true);
        try {
            const result = await deleteAllExternalGifts();
            if (result.success) {
                toast.success(
                    `${result.deleted ?? 0} ${result.deleted === 1 ? "item removido" : "itens removidos"} da vitrine.`
                );
                setConfirming(false);
            } else {
                toast.error(result.message ?? "Não foi possível esvaziar a vitrine.");
            }
        } catch {
            toast.error("Erro inesperado ao esvaziar a vitrine.");
        } finally {
            setIsDeleting(false);
        }
    }

    if (!confirming) {
        return (
            <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full border border-red-200 text-red-600 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-2"
            >
                <Trash2 size={15} /> Excluir todos os itens da vitrine
            </button>
        );
    }

    return (
        <div className="border-2 border-red-300 bg-red-50 rounded-xl p-4">
            <p className="font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle size={18} /> Isso não tem como desfazer
            </p>

            <p className="text-sm text-red-800 mt-2">
                Serão apagados <strong>{total} {total === 1 ? "item" : "itens"}</strong> da vitrine.
            </p>

            {reserved > 0 && (
                <p className="text-sm text-red-900 mt-2 bg-red-100 border border-red-200 rounded-lg p-2.5">
                    <strong>
                        {reserved} {reserved === 1 ? "presente já foi reservado" : "presentes já foram reservados"}
                    </strong>
                    . O nome, o telefone e o recado {reserved === 1 ? "desse convidado" : "desses convidados"}{" "}
                    serão perdidos junto — e não há como recuperar depois.
                </p>
            )}

            <div className="flex gap-2 mt-4">
                <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {isDeleting ? (
                        <>
                            <Loader2 className="animate-spin" size={15} /> Excluindo...
                        </>
                    ) : (
                        <>Sim, excluir {total === 1 ? "o item" : `os ${total} itens`}</>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={isDeleting}
                    className="px-4 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}

/**
 * Tempo mínimo entre pedir confirmação e aceitá-la. Sem isso um duplo clique
 * comum atravessa os dois estágios e executa a ação sem o casal ler o aviso —
 * e tanto liberar quanto excluir apagam os dados do convidado, sem volta.
 */
const CONFIRM_DELAY_MS = 400;

function ExternalGiftRow({ item }: { item: AdminExternalGift }) {
    const [isReleasing, setIsReleasing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // Confirmação em dois cliques em vez de `window.confirm`.
    const [confirmingRelease, setConfirmingRelease] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const confirmedAt = useRef(0);

    async function handleRelease() {
        if (!confirmingRelease) {
            setConfirmingRelease(true);
            confirmedAt.current = Date.now();
            return;
        }
        if (Date.now() - confirmedAt.current < CONFIRM_DELAY_MS) return;

        setIsReleasing(true);
        try {
            const result = await releaseExternalGiftReservation(item.id);
            if (result.success) {
                toast.success("Presente liberado. Ele voltou para a vitrine.");
            } else {
                toast.error(result.message ?? "Não foi possível liberar o presente.");
            }
        } catch {
            toast.error("Erro inesperado ao liberar o presente.");
        } finally {
            setIsReleasing(false);
            setConfirmingRelease(false);
        }
    }

    async function handleDelete() {
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            confirmedAt.current = Date.now();
            return;
        }
        if (Date.now() - confirmedAt.current < CONFIRM_DELAY_MS) return;

        setIsDeleting(true);
        try {
            await deleteExternalGift(item.id);
            toast.success("Item removido da vitrine.");
        } catch {
            toast.error("Não foi possível remover o item.");
            setIsDeleting(false);
            setConfirmingDelete(false);
        }
    }

    return (
        <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-20 h-32 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="80px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="text-gray-300" size={24} />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 line-clamp-1">{item.title}</h3>
                <a
                    href={item.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-xs text-gray-500 hover:text-rose-600 inline-flex items-center gap-1 mt-0.5 max-w-full"
                >
                    <span className="truncate">{item.shortUrl}</span>
                    <ExternalLink size={12} className="shrink-0" />
                </a>

                {item.reservedAt && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                        <p className="font-semibold text-amber-900">
                            Reservado por {item.reservedName}
                        </p>
                        {item.reservedPhone && (
                            <a
                                href={`tel:${item.reservedPhone}`}
                                className="text-amber-800 hover:underline inline-flex items-center gap-1.5 mt-1"
                            >
                                <Phone size={14} />
                                {formatPhone(item.reservedPhone)}
                            </a>
                        )}
                        {item.reservedMessage && (
                            <p className="text-amber-800 italic mt-1.5">“{item.reservedMessage}”</p>
                        )}
                        <p className="text-xs text-amber-700 mt-1.5">
                            em {dateFormatter.format(item.reservedAt)}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
                {item.reservedAt && (
                    <button
                        onClick={handleRelease}
                        disabled={isReleasing}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                            confirmingRelease
                                ? "bg-amber-600 text-white hover:bg-amber-700"
                                : "border border-amber-300 text-amber-700 hover:bg-amber-50"
                        }`}
                        title="Devolve o presente à vitrine e apaga os dados de quem reservou"
                    >
                        {isReleasing && <Loader2 className="animate-spin" size={14} />}
                        {confirmingRelease ? "Confirmar liberação?" : "Liberar presente"}
                    </button>
                )}

                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                        confirmingDelete
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600"
                    }`}
                >
                    {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                    {confirmingDelete ? "Confirmar exclusão?" : "Excluir"}
                </button>
            </div>
        </div>
    );
}
