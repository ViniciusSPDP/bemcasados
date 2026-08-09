"use client";

import { useRef, useState } from "react";
import { createExternalGift, previewExternalGift } from "@/actions/external-gift-actions";
import { ShoppingBag, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

/**
 * Cadastro de um item da vitrine.
 *
 * O botão "Buscar" costuma acertar quando o link é o curto (`meli.la`), mas o
 * Mercado Livre recusa a leitura de página de produto e pode apertar o cerco a
 * qualquer momento. Por isso o preenchimento manual é sempre possível: o botão
 * nunca limpa o que já foi digitado nem impede o salvamento.
 */
export function ExternalGiftForm() {
    const formRef = useRef<HTMLFormElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    // Controlados para que o "buscar dados" consiga preenchê-los.
    const [shortUrl, setShortUrl] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [imageSourceUrl, setImageSourceUrl] = useState("");

    async function handleFetch() {
        if (!shortUrl.trim()) {
            toast.error("Cole o link do produto primeiro.");
            return;
        }

        setIsFetching(true);
        try {
            const data = new FormData();
            data.set("shortUrl", shortUrl);

            const result = await previewExternalGift(data);

            if (result.success && result.draft) {
                if (result.draft.title) setTitle(result.draft.title);
                if (result.draft.description) setDescription(result.draft.description);
                if (result.draft.imageSourceUrl) setImageSourceUrl(result.draft.imageSourceUrl);
                toast.success("Dados encontrados! Confira antes de salvar.");
            } else {
                // Informativo, não erro: preencher à mão é o fluxo normal.
                toast.info(result.message ?? "Preencha os dados abaixo.");
            }
        } catch {
            toast.info("Não foi possível consultar o anúncio. Preencha os dados abaixo.");
        } finally {
            setIsFetching(false);
        }
    }

    async function handleSubmit(formData: FormData) {
        setIsSaving(true);
        try {
            const result = await createExternalGift(formData);
            if (result.success) {
                formRef.current?.reset();
                setShortUrl("");
                setTitle("");
                setDescription("");
                setImageSourceUrl("");
                toast.success("Presente adicionado à vitrine!");
            } else {
                toast.error(result.message ?? "Não foi possível adicionar o presente.");
            }
        } catch {
            toast.error("Erro inesperado ao adicionar o presente.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                <ShoppingBag size={20} className="text-rose-600" />
                Novo item da vitrine
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                O convidado compra direto no Mercado Livre e reserva aqui para ninguém repetir.
            </p>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Link do produto
                    </label>
                    <div className="flex gap-2">
                        <input
                            name="shortUrl"
                            required
                            inputMode="url"
                            value={shortUrl}
                            onChange={(e) => setShortUrl(e.target.value)}
                            placeholder="https://meli.la/..."
                            className="flex-1 min-w-0 p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                        <button
                            type="button"
                            onClick={handleFetch}
                            disabled={isFetching}
                            className="shrink-0 px-3 border border-rose-200 text-rose-700 bg-rose-50 rounded-lg text-sm font-medium hover:bg-rose-100 transition flex items-center gap-1.5 disabled:opacity-60"
                        >
                            {isFetching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                            Buscar
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        O botão do convidado usa exatamente o link que você colar, sem alteração.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Título</label>
                    <input
                        name="title"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Air Fryer 5L"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Descrição <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                        name="description"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Aquela que a gente viu na casa da tia"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                    />
                </div>

                {/* Só faz sentido quando o anúncio tem variação de cor — que é
                    a minoria dos itens. Por isso é opcional e vem com a
                    explicação do porquê: sem ela o convidado compra a cor que
                    estiver selecionada na página do Mercado Livre. */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Cor <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                        name="colorTag"
                        maxLength={24}
                        placeholder="Bege, Off-white, Azul marinho..."
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Preencha só se o anúncio tiver mais de uma cor. Aparece como etiqueta na
                        foto, para o convidado não comprar a errada.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Foto</label>
                    <input
                        type="file"
                        name="image"
                        accept="image/*"
                        className="w-full p-1 border rounded-lg text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Salve a foto do anúncio no celular e envie aqui.
                    </p>
                </div>

                <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800 select-none">
                        Opções avançadas
                    </summary>
                    <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            URL da imagem no Mercado Livre
                        </label>
                        <input
                            name="imageSourceUrl"
                            inputMode="url"
                            value={imageSourceUrl}
                            onChange={(e) => setImageSourceUrl(e.target.value)}
                            placeholder="https://http2.mlstatic.com/..."
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            No computador: botão direito na foto do anúncio → Copiar endereço da imagem.
                            Se você enviar um arquivo acima, ele tem preferência.
                        </p>
                    </div>
                </details>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-rose-600 text-white font-bold py-2 rounded-lg hover:bg-rose-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="animate-spin" size={20} /> Salvando...
                        </>
                    ) : (
                        "Adicionar à vitrine"
                    )}
                </button>
            </form>
        </div>
    );
}
