"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    Users,
    UserCheck,
    UserX,
    UserPlus,
    Phone,
    Trash2,
    Loader2,
    Download,
    Search,
    Pencil,
    Plus,
    X,
    AlertTriangle,
} from "lucide-react";
import { deleteRsvp, updateRsvp } from "@/actions/rsvp-actions";
import { formatPhone } from "@/lib/phone";
import { toCsv } from "@/lib/csv";
import { MAX_COMPANIONS } from "@/lib/definitions";
import {
    countPeople,
    findPossibleDuplicates,
    rsvpCsvFilename,
    rsvpsToCsvRows,
    statusLabel,
    summarizeRsvps,
    type AdminRsvp,
} from "@/lib/rsvp";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

type Filter = "todos" | "SIM" | "NAO";

/** Mesmo tempo do painel da vitrine: um duplo clique não pode apagar sem leitura. */
const CONFIRM_DELAY_MS = 400;

export function RsvpList({ rsvps, slug }: { rsvps: AdminRsvp[]; slug: string }) {
    const [filter, setFilter] = useState<Filter>("todos");
    const [search, setSearch] = useState("");

    const summary = useMemo(() => summarizeRsvps(rsvps), [rsvps]);

    // Calculado sobre a lista INTEIRA, não sobre a filtrada: um filtro não pode
    // esconder que duas linhas se referem à mesma pessoa.
    const duplicates = useMemo(() => findPossibleDuplicates(rsvps), [rsvps]);

    const visible = useMemo(() => {
        // Busca sem acento e sem caixa: o casal digita "jose" e precisa achar
        // "José" — é a lista de nomes próprios, é onde isso mais acontece.
        const term = search
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "");

        return rsvps.filter((rsvp) => {
            if (filter !== "todos" && rsvp.status !== filter) return false;
            if (!term) return true;

            const haystack = [rsvp.name, ...rsvp.companions]
                .join(" ")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[̀-ͯ]/g, "");

            return haystack.includes(term);
        });
    }, [rsvps, filter, search]);

    /**
     * O arquivo é montado aqui, no navegador, a partir da lista que a página já
     * carregou atrás do `verifySession()`. Uma rota de download seria uma
     * superfície de autenticação nova para servir dados que já estão na tela.
     */
    function downloadCsv() {
        // BOM na frente, senão o Excel abre "José" como "JosÃ©".
        const blob = new Blob([`﻿${toCsv(rsvpsToCsvRows(visible))}`], {
            type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = rsvpCsvFilename(slug);
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Em destaque porque é o número que o casal leva ao bufê: são
                    PESSOAS, não respostas — quem confirmou mais quem vem junto. */}
                <SummaryCard
                    icon={<UserCheck size={20} />}
                    color="text-emerald-700 bg-emerald-100"
                    label="Pessoas confirmadas"
                    value={summary.confirmedPeople}
                    hint="convidados + acompanhantes"
                    highlight
                />
                <SummaryCard
                    icon={<UserX size={20} />}
                    color="text-gray-600 bg-gray-100"
                    label="Não vão"
                    value={summary.declined}
                />
                <SummaryCard
                    icon={<Users size={20} />}
                    color="text-rose-600 bg-rose-100"
                    label="Respostas"
                    value={summary.responses}
                />
                <SummaryCard
                    icon={<UserPlus size={20} />}
                    color="text-blue-600 bg-blue-100"
                    label="Acompanhantes"
                    value={summary.companions}
                />
            </div>

            {rsvps.length === 0 ? (
                <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
                    <Users className="mx-auto text-gray-300" size={40} />
                    <p className="mt-3 text-gray-500">
                        Ninguém confirmou ainda. Compartilhe o link do convite com seus convidados.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
                            <FilterButton active={filter === "todos"} onClick={() => setFilter("todos")}>
                                Todos
                            </FilterButton>
                            <FilterButton active={filter === "SIM"} onClick={() => setFilter("SIM")}>
                                Vão
                            </FilterButton>
                            <FilterButton active={filter === "NAO"} onClick={() => setFilter("NAO")}>
                                Não vão
                            </FilterButton>
                        </div>

                        <div className="flex gap-3 flex-1 sm:justify-end">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search
                                    size={15}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por nome"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={downloadCsv}
                                disabled={visible.length === 0}
                                title="Baixa a lista como está filtrada na tela. Abre direto no Excel."
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                            >
                                <Download size={15} />
                                <span className="hidden sm:inline">Baixar para Excel</span>
                                <span className="sm:hidden">Excel</span>
                            </button>
                        </div>
                    </div>

                    {visible.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500 text-sm">
                            Nenhuma resposta com esse filtro.
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                            {visible.map((rsvp) => (
                                <RsvpRow
                                    key={rsvp.id}
                                    rsvp={rsvp}
                                    listedAsCompanionBy={duplicates[rsvp.id]}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function FilterButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
                active ? "bg-rose-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
            {children}
        </button>
    );
}

interface SummaryCardProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    value: number;
    hint?: string;
    highlight?: boolean;
}

function SummaryCard({ icon, color, label, value, hint, highlight }: SummaryCardProps) {
    return (
        <div
            className={`bg-white p-4 rounded-xl shadow-sm border ${
                highlight ? "border-emerald-200 ring-1 ring-emerald-100" : "border-gray-100"
            }`}
        >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-3">{label}</p>
            <p className="text-2xl font-bold text-gray-800 tracking-tight mt-0.5">{value}</p>
            {hint && <p className="text-[0.7rem] text-gray-400 mt-0.5">{hint}</p>}
        </div>
    );
}

function RsvpRow({
    rsvp,
    listedAsCompanionBy,
}: {
    rsvp: AdminRsvp;
    /** Quem já tinha listado esta pessoa como acompanhante, se alguém. */
    listedAsCompanionBy?: string[];
}) {
    const [isDeleting, setIsDeleting] = useState(false);
    // Confirmação em dois cliques, como no painel da vitrine — não há desfazer.
    const [confirming, setConfirming] = useState(false);
    const [editing, setEditing] = useState(false);
    const confirmedAt = useRef(0);

    const going = rsvp.status === "SIM";
    const people = countPeople(rsvp);

    if (editing) {
        return <RsvpEditForm rsvp={rsvp} onDone={() => setEditing(false)} />;
    }

    async function handleDelete() {
        if (!confirming) {
            setConfirming(true);
            confirmedAt.current = Date.now();
            return;
        }
        if (Date.now() - confirmedAt.current < CONFIRM_DELAY_MS) return;

        setIsDeleting(true);
        try {
            const result = await deleteRsvp(rsvp.id);
            if (result.success) {
                toast.success("Confirmação removida.");
            } else {
                toast.error(result.message ?? "Não foi possível remover a confirmação.");
                setIsDeleting(false);
                setConfirming(false);
            }
        } catch {
            toast.error("Erro inesperado ao remover a confirmação.");
            setIsDeleting(false);
            setConfirming(false);
        }
    }

    return (
        <div className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{rsvp.name}</h3>
                    <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            going
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                        }`}
                    >
                        {statusLabel(rsvp.status)}
                    </span>
                    {going && people > 1 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {people} pessoas
                        </span>
                    )}
                </div>

                <a
                    href={`tel:${rsvp.phone}`}
                    className="text-sm text-gray-500 hover:text-rose-600 inline-flex items-center gap-1.5 mt-1"
                >
                    <Phone size={14} />
                    {formatPhone(rsvp.phone)}
                </a>

                {going && rsvp.companions.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                        <span className="text-gray-400">Com: </span>
                        {rsvp.companions.join(", ")}
                    </p>
                )}

                {/*
                  O convite tem um link só, igual para todos. Se a tia incluiu o
                  tio como acompanhante e ele também respondeu por conta
                  própria, ele conta duas vezes no número que vai ao bufê. Pode
                  ser homônimo, então o aviso aponta e não decide — quem apaga
                  uma das linhas é o casal, que sabe quem é quem.
                */}
                {listedAsCompanionBy && listedAsCompanionBy.length > 0 && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                        <span>
                            Também consta como acompanhante de{" "}
                            <strong>{listedAsCompanionBy.join(", ")}</strong> — pode estar
                            contado duas vezes. Se for a mesma pessoa, apague uma das duas.
                        </span>
                    </p>
                )}

                {rsvp.message && (
                    <p className="text-sm text-gray-600 italic mt-2 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                        “{rsvp.message}”
                    </p>
                )}

                <p className="text-xs text-gray-400 mt-2">
                    em {dateFormatter.format(rsvp.createdAt)}
                </p>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                    onClick={() => setEditing(true)}
                    title="Corrigir nome, telefone, acompanhantes ou status"
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1.5"
                >
                    <Pencil size={14} /> Editar
                </button>

                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    title="Remove a confirmação e os dados de quem respondeu"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                        confirming
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600"
                    }`}
                >
                    {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                    {confirming ? "Confirmar exclusão?" : "Excluir"}
                </button>
            </div>
        </div>
    );
}

/**
 * Correção de uma confirmação, no lugar da própria linha.
 *
 * Edita ali mesmo em vez de abrir um diálogo: o casal costuma corrigir várias
 * seguidas depois de conferir a lista no WhatsApp, e um modal por linha faria
 * ele perder o lugar na lista a cada correção.
 */
function RsvpEditForm({ rsvp, onDone }: { rsvp: AdminRsvp; onDone: () => void }) {
    const [status, setStatus] = useState(rsvp.status);
    const [companions, setCompanions] = useState<string[]>(rsvp.companions);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsSaving(true);
        setError(null);

        try {
            const result = await updateRsvp(formData);
            if (result.success) {
                toast.success("Confirmação atualizada.");
                onDone();
            } else {
                setError(result.message ?? "Não foi possível salvar a alteração.");
            }
        } catch {
            setError("Erro inesperado ao salvar.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form action={handleSubmit} className="p-4 bg-rose-50/40 space-y-3">
            <input type="hidden" name="id" value={rsvp.id} />
            <input type="hidden" name="status" value={status} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                    <input
                        name="name"
                        defaultValue={rsvp.name}
                        required
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                    <input
                        name="phone"
                        // Formatado para leitura; o servidor normaliza de volta a
                        // dígitos, então o casal pode digitar do jeito que quiser.
                        defaultValue={formatPhone(rsvp.phone)}
                        required
                        inputMode="tel"
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vai ao casamento?</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setStatus("SIM")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                            status === "SIM"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "border-gray-200 text-gray-600 hover:bg-white"
                        }`}
                    >
                        Vai
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus("NAO")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                            status === "NAO"
                                ? "bg-gray-700 text-white border-gray-700"
                                : "border-gray-200 text-gray-600 hover:bg-white"
                        }`}
                    >
                        Não vai
                    </button>
                </div>
            </div>

            {/* Marcar "não vai" apaga os acompanhantes ao salvar — o servidor
                zera de qualquer jeito, e esconder aqui evita a impressão de que
                eles seriam guardados. */}
            {status === "SIM" && (
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Acompanhantes
                    </label>

                    <div className="space-y-2">
                        {companions.map((value, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    name="companion"
                                    value={value}
                                    onChange={(e) =>
                                        setCompanions((list) =>
                                            list.map((v, i) => (i === index ? e.target.value : v))
                                        )
                                    }
                                    placeholder={`Nome do ${index + 1}º acompanhante`}
                                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCompanions((list) => list.filter((_, i) => i !== index))
                                    }
                                    aria-label={`Remover ${index + 1}º acompanhante`}
                                    className="px-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {companions.length < MAX_COMPANIONS ? (
                        <button
                            type="button"
                            onClick={() => setCompanions((list) => [...list, ""])}
                            className="mt-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg w-full py-2 hover:border-rose-400 hover:bg-white transition flex items-center justify-center gap-1.5"
                        >
                            <Plus size={14} /> Adicionar acompanhante
                        </button>
                    ) : (
                        <p className="text-xs text-gray-500 mt-1">
                            Máximo de {MAX_COMPANIONS} acompanhantes.
                        </p>
                    )}
                </div>
            )}

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recado</label>
                <textarea
                    name="message"
                    rows={2}
                    defaultValue={rsvp.message ?? ""}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                />
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">
                    {error}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-rose-700 transition flex items-center gap-2 disabled:opacity-60"
                >
                    {isSaving && <Loader2 className="animate-spin" size={14} />}
                    Salvar
                </button>
                <button
                    type="button"
                    onClick={onDone}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}
