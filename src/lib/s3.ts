import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { type AllowedMime } from "@/lib/media";
import "server-only";

const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
});

/** Tamanho máximo por arquivo enviado pelo painel do casal. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export class UploadValidationError extends Error {}

/**
 * Identifica o tipo real pelos magic bytes. O `file.type` que chega do navegador
 * é escolhido pelo cliente e não vale como validação — um .html renomeado para
 * .jpg chega aqui se anunciando como `image/jpeg`.
 *
 * SVG fica de fora de propósito: é XML executável e viraria XSS armazenado
 * servido a partir do nosso próprio domínio.
 */
function sniffMime(buf: Buffer): AllowedMime | null {
    if (buf.length < 12) return null;

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return "image/png";
    }

    // WebP: "RIFF" .... "WEBP"
    if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
        return "image/webp";
    }

    return null;
}

/**
 * Maior dimensão guardada. As fotos aparecem como stories em tela cheia; acima
 * disso é peso que nenhuma tela aproveita.
 */
const MAX_DIMENSION = 1920;

/**
 * Envia uma imagem para o bucket e devolve a **chave** do objeto (não a URL).
 * O bucket é privado: a exibição passa por `/api/media/<chave>`.
 *
 * A imagem é reduzida e convertida para WebP aqui, e não no `/_next/image`.
 * Otimizar por requisição custava ~2,3s por foto, porque o otimizador responde
 * com `vary: Accept` e o Cloudflare não cacheia esse tipo de resposta. Fazendo
 * uma vez no upload, o que vai para o bucket já está pronto e a entrega fica
 * cacheada na borda.
 */
export async function uploadFileToS3(file: File): Promise<string> {
    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) throw new Error("S3_BUCKET não configurado");

    if (file.size === 0) {
        throw new UploadValidationError("Arquivo vazio.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new UploadValidationError(
            `Arquivo maior que ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`
        );
    }

    const original = Buffer.from(await file.arrayBuffer());

    // A validação continua sendo pelos magic bytes, antes de qualquer
    // processamento: é ela que impede um .html renomeado de entrar.
    if (!sniffMime(original)) {
        throw new UploadValidationError("Formato inválido. Envie JPEG, PNG ou WebP.");
    }

    let processed: Buffer;
    try {
        processed = await sharp(original)
            .rotate() // respeita o EXIF antes de descartá-lo
            .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
            // O WebP re-encoda a imagem inteira, o que de quebra elimina os
            // metadados EXIF — inclusive a geolocalização que celulares
            // costumam gravar na foto.
            .webp({ quality: 82 })
            .toBuffer();
    } catch {
        throw new UploadValidationError("Não foi possível processar a imagem.");
    }

    // O nome vindo do cliente é descartado por completo: ele controlaria a chave
    // do objeto (prefixos, sobrescrita, caracteres de path).
    const key = `${randomUUID()}.webp`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: processed,
            ContentType: "image/webp" satisfies AllowedMime,
            CacheControl: "private, max-age=31536000, immutable",
        })
    );

    return key;
}

/** Lê um objeto do bucket para ser servido por `/api/media/<chave>`. */
export async function getObjectBody(key: string) {
    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) throw new Error("S3_BUCKET não configurado");

    const result = await s3Client.send(
        new GetObjectCommand({ Bucket: bucketName, Key: key })
    );

    return result.Body;
}
