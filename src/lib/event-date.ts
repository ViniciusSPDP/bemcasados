/**
 * A data do casamento é uma **data pura**, não um instante.
 *
 * O cadastro vem de um `<input type="date">` ("2026-10-24") e é gravada como
 * meia-noite UTC. A coluna é `timestamp without time zone`, então o banco guarda
 * literalmente `2026-10-24 00:00:00` e o Prisma devolve isso como UTC.
 *
 * O erro que este módulo existe para impedir: formatar esse valor com o fuso de
 * quem está olhando. `new Date("2026-10-24T00:00:00Z").toLocaleDateString("pt-BR")`
 * roda no navegador do convidado, que no Brasil está em UTC-3 — e devolve
 * **23 de outubro**. Um dia antes, para todo mundo no país.
 *
 * Aconteceu em produção: o casamento do Mauricio e Verônica aparecia um dia
 * antes, e a data foi cadastrada com um dia a mais para compensar. Compensar no
 * dado é o remendo que quebra quando o bug é corrigido — a correção é ler em
 * UTC, sempre, em toda tela que mostrar esta data.
 */

/**
 * Componentes da data, lidos em UTC.
 *
 * Devolve números para quem precisa montar o próprio texto — o convite escreve
 * "SÁBADO / OUTUBRO 24 / 2026" com rótulos próprios, em caixa alta.
 */
export function eventDateParts(iso: string | Date): {
    weekday: number;
    month: number;
    day: number;
    year: number;
} {
    const date = iso instanceof Date ? iso : new Date(iso);

    return {
        weekday: date.getUTCDay(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        year: date.getUTCFullYear(),
    };
}

/**
 * "24 de outubro de 2026".
 *
 * `timeZone: "UTC"` é a linha que corrige o bug: sem ela o `Intl` usa o fuso do
 * ambiente, que no cliente é o do celular do convidado.
 */
export function formatEventDate(iso: string | Date): string {
    const date = iso instanceof Date ? iso : new Date(iso);

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeZone: "UTC",
    }).format(date);
}
