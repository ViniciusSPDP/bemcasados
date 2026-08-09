/**
 * Etiqueta de cor de um item da vitrine.
 *
 * O problema real: um anúncio do Mercado Livre costuma ter variação de cor, e o
 * convidado compra a que estiver selecionada na página — não a que o casal quer.
 * A etiqueta existe para o convidado ler "BEGE" antes de clicar em comprar.
 *
 * **O nome é o que importa**, e por isso o campo é texto livre: quem escreve a
 * cor é o vendedor do anúncio, e uma lista fechada nossa nunca acompanharia
 * ("off-white", "champanhe", "verde musgo"). A amostra visual é um reforço,
 * derivada do nome quando reconhecemos — e um chip neutro quando não. Nunca o
 * contrário: uma cor errada na bolinha seria pior que bolinha nenhuma, porque o
 * convidado confiaria nela.
 *
 * Módulo puro, com teste: é a mesma regra que roda na vitrine pública e no
 * painel, e as duas não podem divergir.
 */

/** Reduz o nome a uma forma comparável: sem acento, sem caixa, sem separador. */
export function normalizeColorName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        // "azul-marinho", "azul  marinho" e "azul marinho" são a mesma cor.
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ");
}

/**
 * Cores que aparecem de verdade em anúncio de casa e decoração.
 *
 * As chaves já estão normalizadas. A lista é curta de propósito: cada entrada é
 * uma promessa visual, e é melhor cair no chip neutro do que exibir um tom que
 * não corresponde ao produto.
 */
const SWATCHES: Record<string, string> = {
    // neutros — o grosso da decoração
    bege: "#D8C3A5",
    "off white": "#F2EFE6",
    offwhite: "#F2EFE6",
    branco: "#FFFFFF",
    cru: "#EDE6D6",
    marfim: "#FFFFF0",
    nude: "#E3C6B3",
    areia: "#E0D3B8",
    champanhe: "#E8DCC4",
    champagne: "#E8DCC4",
    perola: "#EAE6DA",

    // madeiras e terrosos
    caramelo: "#A9743B",
    marrom: "#6B4423",
    cafe: "#4B3621",
    chocolate: "#3D2B1F",
    tabaco: "#6B4A2F",
    terracota: "#C86B4A",
    telha: "#B5533C",

    // cinzas e metálicos
    cinza: "#9AA0A6",
    "cinza claro": "#C7CBD1",
    "cinza escuro": "#5A5F66",
    chumbo: "#4A4E54",
    grafite: "#3C3F41",
    prata: "#C0C0C0",
    dourado: "#C9A227",
    bronze: "#8C7853",
    cobre: "#B87333",
    preto: "#111111",

    // cores
    rosa: "#F2A6C0",
    "rosa claro": "#F7CBD9",
    vermelho: "#C1272D",
    vinho: "#6E1423",
    bordo: "#6E1423",
    laranja: "#E86A17",
    amarelo: "#F0C419",
    mostarda: "#C99A2E",
    verde: "#2E7D32",
    "verde oliva": "#6B7A3A",
    oliva: "#6B7A3A",
    "verde musgo": "#4A5D23",
    menta: "#A8E0C8",
    tiffany: "#81D8D0",
    azul: "#1E5FA8",
    "azul marinho": "#0A1628",
    marinho: "#0A1628",
    "azul claro": "#A8CBEA",
    turquesa: "#2EC4B6",
    roxo: "#6B3FA0",
    lilas: "#C8A2C8",
    salmao: "#FA8072",
    coral: "#FF6F61",
};

export interface ColorSwatch {
    /** Cor de fundo da bolinha. */
    hex: string;
    /** `true` quando o tom é claro e pede texto/contorno escuro por cima. */
    isLight: boolean;
    /** `false` quando o nome não está na lista e caímos no chip neutro. */
    known: boolean;
}

/** Cinza neutro para nome que não reconhecemos. Não finge ser a cor do produto. */
const DESCONHECIDA = "#8A8F98";

/**
 * Luminância relativa (WCAG). Serve para decidir a cor do texto por cima da
 * bolinha: "branco" e "off-white" some num cartão claro sem contorno escuro.
 */
function isLightColor(hex: string): boolean {
    const v = hex.replace("#", "");
    const canal = (i: number) => {
        const c = parseInt(v.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminancia = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
    return luminancia > 0.5;
}

export function colorSwatch(name: string): ColorSwatch {
    const chave = normalizeColorName(name);
    const hex = SWATCHES[chave];

    if (!hex) {
        return { hex: DESCONHECIDA, isLight: false, known: false };
    }

    return { hex, isLight: isLightColor(hex), known: true };
}

/**
 * O rótulo que aparece na etiqueta.
 *
 * Devolve o texto do casal como ele digitou, só aparado — a vitrine o exibe em
 * caixa alta por CSS, o que preserva o original no banco e no painel.
 */
export function colorLabel(name: string): string {
    return name.trim();
}
