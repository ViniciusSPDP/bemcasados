/**
 * Resolução e validação de mídia. Módulo puro, sem dependência de servidor,
 * para poder ser usado tanto pelas rotas quanto pelos componentes de cliente.
 *
 * O bucket é privado. O que fica gravado em `GalleryItem.imageUrl` e
 * `Gift.imageUrl` é a **chave** do objeto, e quem exibe converte para
 * `/api/media/<chave>` — rota que faz stream do objeto pelo servidor.
 */

/** Formatos aceitos no upload e ao servir. */
export const ALLOWED_IMAGE_MIME = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
} as const;

export type AllowedMime = keyof typeof ALLOWED_IMAGE_MIME;

// Inclui `jpeg` e ignora maiúsculas porque os objetos antigos herdaram o nome
// do arquivo enviado pelo usuário.
const MIME_BY_EXT: Record<string, AllowedMime> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
};

/**
 * Chaves aceitas ao ler do bucket.
 *
 * Uploads novos são `<uuid v4>.<ext>`, mas o bucket já tem objetos do formato
 * antigo (`<timestamp>-<nome-do-arquivo>.jpg`), então o padrão precisa aceitar
 * os dois — senão as fotos já publicadas somem da galeria.
 *
 * O que importa para segurança é o que fica de fora: sem `/`, sem `\` e sem
 * `..`, não há como escapar do prefixo nem alcançar outro caminho do bucket.
 */
export const MEDIA_KEY_PATTERN = /^[A-Za-z0-9._-]{1,200}\.(jpe?g|png|webp)$/i;

export function isSafeMediaKey(key: string): boolean {
    return MEDIA_KEY_PATTERN.test(key) && !key.includes("..");
}

export function mimeForKey(key: string): AllowedMime | null {
    const ext = key.split(".").pop()?.toLowerCase();
    return (ext && MIME_BY_EXT[ext]) || null;
}

/**
 * Converte o valor gravado no banco na URL que o `<Image>` deve consumir.
 *
 * Registros antigos guardaram a URL absoluta do MinIO, de quando o bucket era
 * público, e alguns apontam para placeholders externos: os dois casos são
 * reconhecidos e devolvidos sem alteração.
 */
export function mediaUrl(keyOrUrl: string | null | undefined): string | null {
    if (!keyOrUrl) return null;

    // Placeholder externo ou URL legada: usa como está.
    if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl;

    // Caminho já resolvido (evita prefixar duas vezes).
    if (keyOrUrl.startsWith("/")) return keyOrUrl;

    return `/api/media/${encodeURIComponent(keyOrUrl)}`;
}

// Para Open Graph não existe função separada: o `metadataBase` definido em
// src/app/layout.tsx transforma o caminho relativo em absoluto na hora de
// gerar as tags. Montar a URL na mão aqui só duplicaria essa lógica — e, sem
// NEXT_PUBLIC_SITE_URL, produziria silenciosamente um link para localhost.
