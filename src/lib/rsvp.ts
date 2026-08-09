/**
 * Confirmação de presença: contagem, barreira de saída e exportação.
 *
 * Módulo puro, no mesmo espírito de `external-gift.ts`. As três decisões que
 * moram aqui são as que não podem regredir em silêncio:
 *
 * 1. **O total de pessoas é derivado**, nunca gravado.
 * 2. **A lista só sai do servidor pelo painel**, e com uma lista de campos
 *    fechada — o que atravessa a fronteira para o Client Component é o que
 *    `toAdminRsvp` deixa passar, e nada mais.
 * 3. **O CSV é montado a partir dessa mesma lista**, e não de linhas cruas.
 */

import { formatPhone } from "@/lib/phone";
import type { CsvRow } from "@/lib/csv";

/** "Vai" e "Não vai". String e não enum, como `Transaction.status`. */
export type RsvpStatus = "SIM" | "NAO";

/** A linha como o banco devolve. */
export interface RsvpRow {
    id: string;
    name: string;
    phone: string;
    status: string;
    message: string | null;
    companions: string[];
    createdAt: Date;
    // Opcional porque a consulta do painel nem chega a selecioná-lo. Está no
    // tipo para que, se alguém passar a linha inteira, o descarte aconteça.
    eventId?: string;
}

/** O que o painel do casal recebe. Lista fechada de propósito. */
export interface AdminRsvp {
    id: string;
    name: string;
    /** Só dígitos — o `tel:` e a formatação acontecem na exibição. */
    phone: string;
    status: RsvpStatus;
    message: string | null;
    companions: string[];
    createdAt: Date;
}

/**
 * Barreira de saída.
 *
 * Diferente da vitrine, aqui o destino é uma tela **privada**: o nome e o
 * telefone precisam chegar, é o painel que existe para mostrá-los. O que a
 * função impede é outra coisa — que um campo novo do modelo entre no payload
 * por descuido, junto com o `eventId`, quando alguém trocar o `select` por um
 * `findMany` sem argumento. O teste trava a lista de chaves.
 */
export function toAdminRsvp(row: RsvpRow): AdminRsvp {
    return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        // Qualquer coisa fora de "SIM" é tratada como recusa: é a leitura
        // conservadora. Contar como presente quem não confirmou faria o casal
        // pagar prato a mais no bufê.
        status: row.status === "SIM" ? "SIM" : "NAO",
        message: row.message,
        companions: row.companions,
        createdAt: row.createdAt,
    };
}

/**
 * Pessoas que aquela linha representa: quem respondeu **mais** os acompanhantes.
 *
 * Calculado na leitura, nunca gravado. Um contador guardado junto divergiria da
 * lista de nomes assim que alguém corrigisse a resposta.
 */
export function countPeople(rsvp: Pick<AdminRsvp, "companions">): number {
    return 1 + rsvp.companions.length;
}

export interface RsvpSummary {
    /** O número que o casal leva ao bufê: pessoas, não respostas. */
    confirmedPeople: number;
    /** Quantos responderam que não vão. */
    declined: number;
    /** Respostas recebidas, indo ou não. */
    responses: number;
    /** Acompanhantes de quem confirmou — já incluídos em `confirmedPeople`. */
    companions: number;
}

export function summarizeRsvps(rsvps: AdminRsvp[]): RsvpSummary {
    let confirmedPeople = 0;
    let declined = 0;
    let companions = 0;

    for (const rsvp of rsvps) {
        if (rsvp.status === "SIM") {
            confirmedPeople += countPeople(rsvp);
            companions += rsvp.companions.length;
        } else {
            // Quem não vai não soma pessoa nenhuma — nem os acompanhantes que
            // porventura tenham ficado gravados numa resposta anterior.
            declined++;
        }
    }

    return { confirmedPeople, declined, responses: rsvps.length, companions };
}

/** Rótulo legível do status, usado na tela e no CSV. */
export function statusLabel(status: RsvpStatus): string {
    return status === "SIM" ? "Vai" : "Não vai";
}

/**
 * Nome reduzido a uma forma comparável: sem acento, sem caixa, sem espaço
 * repetido. "José  Silva" e "jose silva" são a mesma pessoa para efeito de
 * conferência — a tia digita o nome do tio de um jeito e ele se cadastra de
 * outro.
 */
export function normalizeName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ");
}

/**
 * Quem pode estar contado duas vezes.
 *
 * O convite tem um link só, igual para todo mundo. Se a tia confirma e inclui o
 * tio como acompanhante, ele já está contado — mas nada impede que ele receba o
 * mesmo link e confirme com o próprio telefone. A chave única é
 * `(evento, telefone)`, então isso vira uma segunda linha, e o total que vai ao
 * bufê sobe sem ninguém perceber.
 *
 * Não dá para resolver sozinho: pode ser homônimo, e pode ser que a tia tenha
 * se enganado. Quem decide qual linha apagar é o casal — aqui só apontamos.
 *
 * Devolve, por id de confirmação, os nomes de quem já tinha listado essa pessoa
 * como acompanhante.
 */
export function findPossibleDuplicates(rsvps: AdminRsvp[]): Record<string, string[]> {
    // acompanhante normalizado → quem o listou
    const listedBy = new Map<string, { id: string; name: string }[]>();

    for (const rsvp of rsvps) {
        for (const companion of rsvp.companions) {
            const key = normalizeName(companion);
            if (!key) continue;
            listedBy.set(key, [...(listedBy.get(key) ?? []), { id: rsvp.id, name: rsvp.name }]);
        }
    }

    const result: Record<string, string[]> = {};

    for (const rsvp of rsvps) {
        // O `id !== id` cobre o caso de alguém se colocar como próprio
        // acompanhante — engano comum, mas não é duas pessoas.
        const hosts = (listedBy.get(normalizeName(rsvp.name)) ?? [])
            .filter((host) => host.id !== rsvp.id)
            .map((host) => host.name);

        if (hosts.length > 0) result[rsvp.id] = hosts;
    }

    return result;
}

/**
 * Data no formato `dd/mm/aaaa hh:mm`, a partir dos componentes locais.
 *
 * Sem `Intl` de propósito: a função é pura e testável, e o resultado não muda
 * conforme o locale de quem roda o teste.
 */
function formatDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

/** Cabeçalho da planilha exportada. Em português: quem abre é o bufê. */
const CSV_HEADER: CsvRow = [
    "nome",
    "telefone",
    "status",
    "pessoas",
    "acompanhantes",
    "recado",
    "data",
];

/**
 * Linhas da planilha que o casal baixa e leva para o bufê ou para a portaria.
 *
 * A coluna **pessoas** existe porque é a pergunta que o bufê faz, e somar
 * acompanhante à mão numa lista de 120 linhas é onde o erro aparece.
 *
 * Todo campo de texto passa por `escapeCsvFormula` dentro do `toCsv` — o nome e
 * o recado vêm de um formulário aberto.
 */
export function rsvpsToCsvRows(rsvps: AdminRsvp[]): CsvRow[] {
    return [
        CSV_HEADER,
        ...rsvps.map((rsvp) => [
            rsvp.name,
            // Formatado, e não os dígitos crus: o Excel transformaria
            // "11987654321" em notação científica.
            formatPhone(rsvp.phone),
            statusLabel(rsvp.status),
            String(countPeople(rsvp)),
            rsvp.companions.join(", "),
            rsvp.message ?? "",
            formatDateTime(rsvp.createdAt),
        ]),
    ];
}

/** Nome do arquivo baixado. O slug situa a planilha quando o casal a repassa. */
export function rsvpCsvFilename(slug: string): string {
    return `presencas-${slug}.csv`;
}
