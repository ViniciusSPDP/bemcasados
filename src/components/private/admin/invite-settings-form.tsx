"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, ScrollText, ExternalLink, ImageIcon, X } from "lucide-react";
import { updateInviteSettings } from "@/actions/event-actions";
import { MAX_UPLOAD_BYTES_CLIENT, tooLargeMessage } from "@/lib/upload-limits";
import { compressImage } from "@/lib/image-compress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * Só os campos do convite. Não recebe o evento inteiro de propósito: este é um
 * Client Component, então tudo o que chegar aqui é serializado para o HTML.
 */
export interface InviteSettingsData {
    slug: string;
    monogram: string | null;
    inviteVerse: string | null;
    ceremonyTime: string | null;
    ceremonyVenue: string | null;
    ceremonyAddress: string | null;
    ceremonyMapsUrl: string | null;
    /** Já resolvida para `/api/media/<chave>` por quem renderizou a página. */
    inviteImageUrl: string | null;
}

export function InviteSettingsForm({ event }: { event: InviteSettingsData }) {
    const formRef = useRef<HTMLFormElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Foto nova escolhida mas ainda não salva.
    const [preview, setPreview] = useState<string | null>(null);
    // Marca a remoção da foto já salva, aplicada só ao enviar.
    const [removed, setRemoved] = useState(false);

    // `createObjectURL` reserva memória até ser revogada.
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const original = e.target.files?.[0];
        if (!original) return;

        setIsCompressing(true);
        try {
            // Reduz no navegador antes de enviar: é o que impede a foto do
            // celular de estourar o limite de corpo das Server Actions.
            const file = await compressImage(original);

            if (file.size > MAX_UPLOAD_BYTES_CLIENT) {
                toast.error(tooLargeMessage(original.name));
                e.target.value = "";
                return;
            }

            // O input só carrega o arquivo original; trocar o conteúdo dele pelo
            // comprimido é o que faz o FormData enviar a versão menor.
            const dt = new DataTransfer();
            dt.items.add(file);
            e.target.files = dt.files;

            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(file));
            setRemoved(false);
        } finally {
            setIsCompressing(false);
        }
    }

    function clearImage() {
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setRemoved(true);
        if (fileRef.current) fileRef.current.value = "";
    }

    async function handleSubmit(formData: FormData) {
        setIsSaving(true);
        try {
            const result = await updateInviteSettings(formData);
            if (result.success) {
                toast.success("Convite atualizado!");
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
                setRemoved(false);
            } else {
                toast.error(result.message ?? "Não foi possível salvar o convite.");
            }
        } catch {
            // O caso conhecido é o corpo cortado por arquivo grande demais; a
            // checagem acima já previne, mas a rede também pode falhar no meio.
            toast.error("Não foi possível enviar. Verifique a conexão e o tamanho da foto.");
        } finally {
            setIsSaving(false);
        }
    }

    const currentImage = removed ? null : (preview ?? event.inviteImageUrl);

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ScrollText size={20} className="text-rose-600" />
                        Convite
                    </CardTitle>
                    <CardDescription>
                        A página que você manda para os convidados.{" "}
                        <a
                            href={`/${event.slug}/convite`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                        >
                            Ver o convite <ExternalLink size={13} />
                        </a>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <Label htmlFor="monogram">Monograma</Label>
                            <Input
                                id="monogram"
                                name="monogram"
                                defaultValue={event.monogram ?? ""}
                                placeholder="J | J"
                                maxLength={20}
                            />
                            <p className="text-xs text-gray-500 mt-1">As iniciais no topo.</p>
                        </div>

                        <div className="sm:col-span-2">
                            <Label htmlFor="ceremonyTime">Horário da cerimônia</Label>
                            <Input
                                id="ceremonyTime"
                                name="ceremonyTime"
                                defaultValue={event.ceremonyTime ?? ""}
                                placeholder="20:30"
                                inputMode="numeric"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                A data vem do cadastro do evento; aqui é só a hora.
                            </p>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="inviteVerse">Frase de abertura</Label>
                        <Textarea
                            id="inviteVerse"
                            name="inviteVerse"
                            rows={3}
                            defaultValue={event.inviteVerse ?? ""}
                            placeholder='"Para que vejam, saibam, considerem e compreendam que a mão de Deus fez isso." — Isaías 41:20'
                            maxLength={400}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon size={20} className="text-rose-600" />
                        Foto de fundo do convite
                    </CardTitle>
                    <CardDescription>
                        Só do convite — não entra nos stories. Aparece bem suave atrás do texto,
                        para o dourado continuar legível. Retrato funciona melhor no celular.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* O servidor só apaga a foto quando este campo vem marcado. */}
                    {removed && <input type="hidden" name="removeInviteImage" value="1" />}

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="relative w-32 h-44 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                            {currentImage ? (
                                <>
                                    <Image
                                        src={currentImage}
                                        alt="Prévia do fundo do convite"
                                        fill
                                        className="object-cover"
                                        sizes="128px"
                                        unoptimized={currentImage.startsWith("blob:")}
                                    />
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition"
                                        title="Remover foto"
                                    >
                                        <X size={14} />
                                    </button>
                                    {preview && (
                                        <span className="absolute bottom-1.5 left-1.5 bg-rose-600 text-white text-[0.6rem] font-semibold px-1.5 py-0.5 rounded">
                                            NOVA
                                        </span>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
                                    <ImageIcon size={24} />
                                    <span className="text-[0.6rem] text-gray-400">sem foto</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <input
                                ref={fileRef}
                                type="file"
                                name="inviteImage"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                                className="w-full p-1 border rounded-lg text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                            />
                            {isCompressing && (
                                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1.5">
                                    <Loader2 className="animate-spin" size={13} /> Preparando a foto...
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                                JPEG, PNG ou WebP, de qualquer tamanho — a foto é reduzida aqui
                                mesmo antes de subir. Os dados de localização que o celular grava
                                nela são removidos.
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Sem foto, o convite fica no azul-marinho liso.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Local da cerimônia</CardTitle>
                    <CardDescription>
                        Preenche o botão &ldquo;Localização&rdquo; do convite. Sem o link do mapa,
                        o ícone aparece apagado.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="ceremonyVenue">Nome do local</Label>
                        <Input
                            id="ceremonyVenue"
                            name="ceremonyVenue"
                            defaultValue={event.ceremonyVenue ?? ""}
                            placeholder="Igreja Matriz de São José"
                            maxLength={160}
                        />
                    </div>

                    <div>
                        <Label htmlFor="ceremonyAddress">Endereço</Label>
                        <Input
                            id="ceremonyAddress"
                            name="ceremonyAddress"
                            defaultValue={event.ceremonyAddress ?? ""}
                            placeholder="Rua das Flores, 100 — Centro, São Paulo/SP"
                            maxLength={300}
                        />
                    </div>

                    <div>
                        <Label htmlFor="ceremonyMapsUrl">Link do mapa</Label>
                        <Input
                            id="ceremonyMapsUrl"
                            name="ceremonyMapsUrl"
                            defaultValue={event.ceremonyMapsUrl ?? ""}
                            placeholder="https://maps.app.goo.gl/..."
                            maxLength={600}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            No Google Maps: busque o local → Compartilhar → Copiar link. Também
                            aceita Waze e OpenStreetMap.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Button type="submit" disabled={isSaving} className="w-full bg-rose-600 hover:bg-rose-700">
                {isSaving ? (
                    <>
                        <Loader2 className="animate-spin" size={18} /> Salvando...
                    </>
                ) : (
                    "Salvar convite"
                )}
            </Button>
        </form>
    );
}
