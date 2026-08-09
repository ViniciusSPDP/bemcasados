/**
 * Fronteira entre a linha do banco e o que a vitrine pública pode enxergar.
 *
 * A página `/[slug]/vitrine` é aberta e anônima, e tudo que o Server Component
 * passa ao Client Component vai junto no payload RSC — visível em "ver código
 * fonte". Nome, telefone e mensagem de quem reservou **não podem** sair daqui.
 *
 * A página já usa `select` explícito, mas `select` é fácil de ampliar sem
 * perceber. Esta função é a segunda trava, e existe como módulo puro para poder
 * ter teste: é mais confiável do que confiar na memória de quem mexer depois.
 */

export interface ExternalGiftRow {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    shortUrl: string;
    /** Cor pedida pelo casal, quando o anúncio tem variação. Null é o normal. */
    colorTag?: string | null;
    reservedAt: Date | null;
    // Opcionais porque a consulta da vitrine nem chega a selecioná-los. Estão
    // no tipo para que, se alguém passar a linha inteira, o descarte aconteça.
    reservedName?: string | null;
    reservedPhone?: string | null;
    reservedMessage?: string | null;
}

export interface PublicExternalGift {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    /** O link curto original, intacto — é ele que carrega a comissão. */
    shortUrl: string;
    /**
     * Cor pedida pelo casal. Sai de propósito: é informação PARA o convidado —
     * sem ela ele compra a variação errada do anúncio. Diferente do nome e do
     * telefone de quem reservou, aqui não há dado pessoal envolvido.
     */
    colorTag: string | null;
    isReserved: boolean;
}

export function toPublicExternalGift(row: ExternalGiftRow): PublicExternalGift {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.imageUrl,
        shortUrl: row.shortUrl,
        colorTag: row.colorTag ?? null,
        // Só o fato de estar reservado. O convidado não precisa saber por quem,
        // e publicar "Reservado por João" numa página aberta seria expor dado
        // pessoal sem necessidade — o casal vê o nome no painel.
        isReserved: row.reservedAt !== null,
    };
}
