/**
 * CPF/CNPJ: validação de dígito verificador e mascaramento.
 *
 * A validação evita mandar documento inventado para o Asaas (que rejeitaria a
 * cobrança) e reduz lixo na base. O mascaramento é o que permite não guardar o
 * documento completo.
 */

function isValidCpf(digits: string): boolean {
    if (digits.length !== 11) return false;
    // Sequências repetidas (000..., 111...) passam no cálculo mas não existem.
    if (/^(\d)\1{10}$/.test(digits)) return false;

    for (const [length, weightStart] of [[9, 10], [10, 11]] as const) {
        let sum = 0;
        for (let i = 0; i < length; i++) {
            sum += Number(digits[i]) * (weightStart - i);
        }
        const remainder = (sum * 10) % 11;
        const check = remainder === 10 ? 0 : remainder;
        if (check !== Number(digits[length])) return false;
    }

    return true;
}

function isValidCnpj(digits: string): boolean {
    if (digits.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(digits)) return false;

    const calc = (length: number) => {
        let sum = 0;
        let weight = length - 7;
        for (let i = 0; i < length; i++) {
            sum += Number(digits[i]) * weight;
            weight = weight - 1 < 2 ? 9 : weight - 1;
        }
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

/** Aceita apenas dígitos — quem chama já normalizou. */
export function isValidCpfCnpj(digits: string): boolean {
    return isValidCpf(digits) || isValidCnpj(digits);
}

/**
 * Reduz o documento ao que é útil para conferência, descartando o resto.
 * CPF  `12345678909` -> `•••.•••.890-••`
 * CNPJ `11222333000181` -> `••.•••.•••/0001-••`
 */
export function maskDocument(digits: string): string {
    if (digits.length === 11) {
        return `•••.•••.${digits.slice(6, 9)}-••`;
    }
    if (digits.length === 14) {
        return `••.•••.•••/${digits.slice(8, 12)}-••`;
    }
    return "•••••••••••";
}
