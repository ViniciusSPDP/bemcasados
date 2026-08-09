"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Check, AlertTriangle, X, Download } from "lucide-react";
import { importExternalGifts, type ImportRowResult } from "@/actions/external-gift-actions";
// Mesmo valor que a action aplica — o aviso não pode divergir da regra.
import { MAX_IMPORT_ROWS } from "@/lib/definitions";

/** Planilha de exemplo, gerada no navegador — evita hospedar um arquivo. */
const TEMPLATE = [
    "link;titulo;descricao",
    "https://meli.la/1Sq9Q2D;Air Fryer 5L;Aquela que vimos na casa da tia",
    "https://meli.la/ZzTeste9;;",
].join("\n");

export function ExternalGiftImport() {
    const formRef = useRef<HTMLFormElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [rows, setRows] = useState<ImportRowResult[] | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    function downloadTemplate() {
        // BOM na frente para o Excel abrir os acentos corretamente.
        const blob = new Blob([`﻿${TEMPLATE}`], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "modelo-vitrine.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function handleSubmit(formData: FormData) {
        setIsImporting(true);
        setRows(null);
        try {
            const result = await importExternalGifts(formData);

            if (!result.success) {
                toast.error(result.message ?? "Não foi possível importar.");
                return;
            }

            setRows(result.rows ?? []);
            const imported = result.imported ?? 0;

            if (imported === 0) {
                toast.error("Nenhum item foi importado. Veja o relatório abaixo.");
            } else {
                toast.success(`${imported} ${imported === 1 ? "item importado" : "itens importados"}!`);
                formRef.current?.reset();
                setFileName(null);
            }
        } catch {
            toast.error("Erro inesperado ao importar a planilha.");
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-rose-600" />
                Importar vários de uma vez
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                Planilha com uma coluna <code className="bg-gray-100 px-1 rounded">link</code>. As
                colunas <code className="bg-gray-100 px-1 rounded">titulo</code> e{" "}
                <code className="bg-gray-100 px-1 rounded">descricao</code> são opcionais — servem de
                reserva para quando o anúncio não puder ser lido.
            </p>

            {/*
              Aviso em destaque, e não uma nota de rodapé: o casal costuma montar
              a planilha inteira de uma vez e, sem ler isto, acha que importou
              tudo e só descobre o que faltou quando o convidado reclama.
            */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
                <p className="font-bold text-amber-900 flex items-center gap-2 text-base">
                    <AlertTriangle size={20} className="shrink-0" />
                    Máximo de {MAX_IMPORT_ROWS} itens por vez
                </p>
                <p className="text-sm text-amber-900 mt-2 leading-relaxed">
                    Se a sua planilha tiver mais que isso,{" "}
                    <strong>
                        importe em partes de {MAX_IMPORT_ROWS} em {MAX_IMPORT_ROWS}
                    </strong>
                    . As linhas que passarem do limite aparecem no relatório como não importadas —
                    basta rodar de novo com o restante.
                </p>
                <p className="text-xs text-amber-800 mt-2">
                    O limite existe porque cada linha consulta o Mercado Livre, e um lote grande
                    demais faz eles bloquearem as consultas por suspeita de robô.
                </p>
            </div>

            <button
                type="button"
                onClick={downloadTemplate}
                className="text-sm text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5 mb-4"
            >
                <Download size={14} /> Baixar planilha de exemplo
            </button>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Arquivo CSV
                    </label>
                    <input
                        type="file"
                        name="csvFile"
                        accept=".csv,text/csv,text/plain"
                        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                        className="w-full p-1 border rounded-lg text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        No Excel ou no Google Sheets: Arquivo → Baixar → CSV.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-gray-100" />
                    <span className="relative bg-white px-2 text-xs text-gray-400 left-1/2 -translate-x-1/2 inline-block">
                        ou cole os links
                    </span>
                </div>

                <div>
                    <textarea
                        name="csvText"
                        rows={4}
                        placeholder={"https://meli.la/1Sq9Q2D\nhttps://meli.la/ZzTeste9"}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-sm font-mono resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Um link por linha. Se você escolher um arquivo acima, ele tem preferência.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isImporting}
                    className="w-full bg-rose-600 text-white font-bold py-2 rounded-lg hover:bg-rose-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Buscando os produtos... isso leva alguns segundos
                        </>
                    ) : (
                        "Importar"
                    )}
                </button>

                {fileName && !isImporting && (
                    <p className="text-xs text-gray-500 text-center">Arquivo: {fileName}</p>
                )}
            </form>

            {rows && rows.length > 0 && <ImportReport rows={rows} onClose={() => setRows(null)} />}
        </div>
    );
}

const STATUS_STYLE: Record<ImportRowResult["status"], { bg: string; icon: React.ReactNode; label: string }> = {
    importado: {
        bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
        icon: <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />,
        label: "Importado",
    },
    "sem-dados": {
        bg: "bg-amber-50 border-amber-200 text-amber-900",
        icon: <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />,
        label: "Não encontrado",
    },
    invalido: {
        bg: "bg-amber-50 border-amber-200 text-amber-900",
        icon: <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />,
        label: "Link inválido",
    },
    duplicado: {
        bg: "bg-gray-50 border-gray-200 text-gray-700",
        icon: <X size={14} className="text-gray-500 shrink-0 mt-0.5" />,
        label: "Já existia",
    },
    erro: {
        bg: "bg-red-50 border-red-200 text-red-900",
        icon: <X size={14} className="text-red-600 shrink-0 mt-0.5" />,
        label: "Não importado",
    },
};

function ImportReport({ rows, onClose }: { rows: ImportRowResult[]; onClose: () => void }) {
    const failed = rows.filter((r) => r.status !== "importado");

    return (
        <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">
                    Relatório da importação
                    {failed.length > 0 && (
                        <span className="text-gray-500 font-normal">
                            {" "}
                            — {failed.length} {failed.length === 1 ? "linha precisa" : "linhas precisam"} da
                            sua atenção
                        </span>
                    )}
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                    type="button"
                >
                    fechar
                </button>
            </div>

            <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                {rows.map((row) => {
                    const style = STATUS_STYLE[row.status];
                    return (
                        <li
                            key={`${row.line}-${row.link}`}
                            className={`flex gap-2 border rounded-lg px-3 py-2 text-xs ${style.bg}`}
                        >
                            {style.icon}
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                    Linha {row.line} · {style.label}
                                </p>
                                <p className="opacity-90 mt-0.5">{row.message}</p>
                                <p className="opacity-60 truncate mt-0.5 font-mono">{row.link}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
