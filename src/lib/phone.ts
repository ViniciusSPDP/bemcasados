/**
 * Telefone brasileiro: normalização, validação e máscara de exibição.
 *
 * Módulo puro, no mesmo espírito de `documents.ts`: o convidado digita como
 * quiser e o banco guarda só os dígitos. Sem isso o mesmo número entraria de
 * cinco formas diferentes ("11987654321", "(11) 98765-4321", "11 98765 4321"),
 * e o casal veria a mesma pessoa como contatos distintos.
 */

/** DDDs que existem de verdade. A ANATEL não usa 10, 20, 23, 25, 26, 29… */
const VALID_AREA_CODES = new Set([
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24, 27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 53, 54, 55,
    61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79,
    81, 82, 83, 84, 85, 86, 87, 88, 89,
    91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Reduz a dígitos e descarta o código do Brasil quando ele vem junto.
 *
 * O campo usa `autoComplete="tel"`, e o preenchimento automático do celular
 * costuma devolver `+55 11 98765-4321`. Sem este recorte o número chegaria com
 * 13 dígitos e seria recusado como inválido, sem o convidado entender por quê.
 */
export function onlyDigits(value: string): string {
    const digits = value.replace(/\D/g, "");

    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
        return digits.slice(2);
    }

    return digits;
}

/**
 * Aceita apenas dígitos — quem chama já normalizou com `onlyDigits`.
 *
 * 10 dígitos = DDD + fixo de 8. 11 dígitos = DDD + celular, que desde 2016 tem
 * o nono dígito obrigatório e sempre começa com 9. Um número de 11 dígitos cujo
 * terceiro não seja 9 é erro de digitação, não um telefone válido.
 *
 * O DDD é conferido contra a lista real porque é onde mora o engano comum:
 * quem digita "0" antes do DDD (velho hábito de interurbano) produz 10 dígitos
 * que passariam por um teste só de comprimento.
 */
export function isValidBrazilianPhone(digits: string): boolean {
    if (digits.length !== 10 && digits.length !== 11) return false;

    // Sequências repetidas passam em qualquer regra estrutural e não existem.
    if (/^(\d)\1+$/.test(digits)) return false;

    if (!VALID_AREA_CODES.has(Number(digits.slice(0, 2)))) return false;

    if (digits.length === 11) return digits[2] === "9";

    // Fixo: a faixa 2-5 é a de assinantes; 6-9 é móvel e não cabe em 8 dígitos.
    return digits[2] >= "2" && digits[2] <= "5";
}

/**
 * Formata para leitura do casal no painel. Entrada fora do padrão volta como
 * está: é tela de exibição, não pode quebrar por causa de um registro legado.
 */
export function formatPhone(digits: string): string {
    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return digits;
}
