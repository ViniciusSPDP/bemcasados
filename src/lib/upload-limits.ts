/**
 * Limite de upload compartilhado entre cliente e servidor.
 *
 * O servidor é quem decide de verdade (`MAX_UPLOAD_BYTES` em `src/lib/s3.ts`,
 * que só roda no servidor). Este módulo é puro e existe para o formulário poder
 * barrar o arquivo grande **antes** de enviá-lo.
 *
 * Sem essa checagem no cliente, uma foto de celular acima do limite de corpo das
 * Server Actions (10 MB) fazia o Next interromper o stream no meio, e o erro que
 * chegava era `Unexpected end of form` — que virava um "Erro ao atualizar
 * evento" genérico, sem dizer ao casal que o problema era o tamanho da foto.
 */
/**
 * Teto por arquivo, depois da compressão do navegador.
 *
 * Fica abaixo do limite de corpo das Server Actions (10 MB, em `next.config.ts`)
 * de propósito: é o que garante que o Next nunca precise cortar o stream, que é
 * a falha difícil de diagnosticar. Como o cliente comprime antes de enviar, uma
 * foto de celular chega bem abaixo disto — o limite só age quando a compressão
 * não pôde acontecer.
 */
export const MAX_UPLOAD_MB = 8;
export const MAX_UPLOAD_BYTES_CLIENT = MAX_UPLOAD_MB * 1024 * 1024;

/** Maior lado da imagem depois da compressão no navegador. */
export const MAX_DIMENSION_CLIENT = 1920;

/** Qualidade do WebP gerado no navegador. */
export const COMPRESS_QUALITY = 0.85;

/** Mensagem única, para cliente e servidor não divergirem no texto. */
export function tooLargeMessage(fileName?: string): string {
    const prefix = fileName ? `"${fileName}"` : "A imagem";
    return `${prefix} continua acima de ${MAX_UPLOAD_MB}MB mesmo depois de comprimida. Tente outra foto.`;
}
