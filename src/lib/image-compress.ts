import { MAX_DIMENSION_CLIENT, COMPRESS_QUALITY } from "@/lib/upload-limits";

/**
 * Comprime a foto no navegador, antes de enviar.
 *
 * O servidor já converte tudo para WebP com `sharp`, mas isso acontece **depois**
 * do upload — e o problema é o upload em si: uma foto de celular moderno passa
 * de 10 MB, que é o teto do corpo das Server Actions. Acima disso o Next corta o
 * stream e o erro que chega é `Unexpected end of form`.
 *
 * Comprimir aqui resolve os dois lados: o arquivo chega pequeno (uma foto de
 * 12 MB costuma virar menos de 1 MB) e o envio pelo celular fica muito mais
 * rápido. O `sharp` continua reprocessando no servidor — é a garantia de que um
 * arquivo que escape deste caminho ainda é normalizado.
 */

/** Formatos que o servidor aceita (`sniffMime` valida por magic bytes). */
const OUTPUT_CANDIDATES = ["image/webp", "image/jpeg"] as const;

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Devolve o arquivo comprimido, ou o **original** se algo der errado.
 *
 * Nunca lança: falhar na compressão não pode impedir o casal de enviar a foto.
 * Quando volta o original, a checagem de tamanho do formulário ainda se aplica.
 */
export async function compressImage(file: File): Promise<File> {
    // SVG é recusado pelo servidor e não faz sentido redimensionar; GIF perderia
    // a animação. Deixa passar direto e o servidor decide.
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;

    try {
        // `from-image` aplica a orientação do EXIF: sem isso, foto tirada em pé
        // no celular chega deitada, porque o canvas ignora a tag de rotação.
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

        const scale = Math.min(1, MAX_DIMENSION_CLIENT / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            bitmap.close();
            return file;
        }

        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        for (const type of OUTPUT_CANDIDATES) {
            const blob = await canvasToBlob(canvas, type, COMPRESS_QUALITY);

            // Safari antigo devolve PNG quando não conhece o formato pedido, e
            // PNG de foto costuma ficar maior que o original.
            if (!blob || blob.type !== type) continue;
            if (blob.size >= file.size) return file;

            const ext = type === "image/webp" ? "webp" : "jpg";
            return new File([blob], `foto.${ext}`, { type, lastModified: Date.now() });
        }

        return file;
    } catch {
        // Navegador sem `createImageBitmap`, imagem corrompida, memória
        // insuficiente para o canvas — em todos os casos, manda o original.
        return file;
    }
}
