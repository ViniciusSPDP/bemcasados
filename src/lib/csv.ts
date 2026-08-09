/**
 * CSV nos dois sentidos: leitura (importação em lote da vitrine) e escrita
 * (exportação da lista de presenças).
 *
 * Módulo puro, sem dependência: o `.xlsx` é um formato binário que exigiria uma
 * biblioteca de terceiro para ser lido, e tanto o Excel quanto o Google Sheets
 * exportam CSV com um clique. Em troca, o parser precisa aguentar o que essas
 * duas ferramentas realmente produzem — que é menos regular do que parece.
 */

/** Uma linha já separada em colunas. */
export type CsvRow = string[];

/**
 * Descobre o separador olhando a primeira linha.
 *
 * O Excel em português exporta com `;`, porque a vírgula é o separador decimal
 * no nosso formato de número. O Google Sheets exporta com `,`. Assumir um dos
 * dois faria metade das planilhas chegar como uma coluna só.
 */
function detectDelimiter(firstLine: string): string {
    const candidates = [";", ",", "\t"];
    let best = ",";
    let bestCount = 0;

    for (const c of candidates) {
        // Conta só o que está fora de aspas, senão "São Paulo, SP" inflaria a vírgula.
        let count = 0;
        let inQuotes = false;
        for (let i = 0; i < firstLine.length; i++) {
            const ch = firstLine[i];
            if (ch === '"') inQuotes = !inQuotes;
            else if (ch === c && !inQuotes) count++;
        }
        if (count > bestCount) {
            best = c;
            bestCount = count;
        }
    }

    return best;
}

/**
 * Converte o texto do CSV em linhas de colunas.
 *
 * Trata: aspas duplas, separador e quebra de linha dentro de aspas, `""` como
 * aspas escapadas, CRLF do Windows, BOM que o Excel escreve no início do arquivo
 * e linhas em branco.
 */
export function parseCsv(text: string): CsvRow[] {
    // O Excel grava um BOM (U+FEFF) no começo. Sem removê-lo, o primeiro
    // cabeçalho vira "﻿link" e nenhuma coluna é reconhecida.
    const input = text.replace(/^﻿/, "");
    if (!input.trim()) return [];

    const firstLineEnd = input.search(/\r?\n/);
    const delimiter = detectDelimiter(firstLineEnd === -1 ? input : input.slice(0, firstLineEnd));

    const rows: CsvRow[] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    const endField = () => {
        row.push(field.trim());
        field = "";
    };
    const endRow = () => {
        endField();
        // Linha vazia é PRESERVADA de propósito. Descartá-la aqui desalinharia a
        // numeração: uma linha em branco no meio da planilha faria todo item
        // seguinte ser reportado com o número errado, e o casal iria procurar o
        // erro na linha errada do arquivo. Quem filtra é o `readSheet`, depois
        // de já ter atribuído o número.
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (inQuotes) {
            if (char === '"') {
                // `""` dentro de aspas representa uma aspa literal.
                if (input[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            endField();
        } else if (char === "\n") {
            endRow();
        } else if (char !== "\r") {
            field += char;
        }
    }

    // Última linha, quando o arquivo não termina em quebra.
    if (field !== "" || row.length > 0) endRow();

    // Sobras do fim do arquivo podem sair: elas não têm linha seguinte para
    // desalinhar, e o Excel costuma gravar várias.
    while (rows.length > 0 && rows[rows.length - 1].every((c) => c === "")) {
        rows.pop();
    }

    return rows;
}

/* ------------------------------------------------------------------------- */
/* Escrita — o caminho inverso do parser                                      */
/* ------------------------------------------------------------------------- */

/**
 * Neutraliza célula que o Excel executaria como fórmula.
 *
 * Uma célula que começa com `=`, `+`, `-` ou `@` é interpretada como fórmula, e
 * `=cmd|'/c calc'!A1` chega a abrir programa em versões antigas do Excel. Isso
 * importa porque o CSV que o casal baixa é montado com texto que veio de um
 * **formulário público e anônimo**: o nome, o nome do acompanhante e o recado do
 * RSVP são escritos por qualquer pessoa com o link do convite.
 *
 * O prefixo `'` é o que o Excel entende como "isto é texto"; ele aparece na
 * barra de fórmulas, mas não na célula.
 */
export function escapeCsvFormula(value: string): string {
    // O TAB e o CR entram na lista porque o Excel os ignora ao decidir se a
    // célula é fórmula — "\t=1+1" é avaliado do mesmo jeito.
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Monta o texto do CSV a partir das linhas.
 *
 * Separador `;` por padrão: é o que o Excel em português espera, e é o mesmo que
 * o `detectDelimiter` reconhece na volta — o arquivo exportado daqui é lido pelo
 * `parseCsv` sem ajuste.
 *
 * As linhas terminam em CRLF porque é o que o Excel gera e o que ele lê sem
 * reclamar; o parser aceita os dois.
 */
export function toCsv(rows: CsvRow[], delimiter = ";"): string {
    const needsQuotes = new RegExp(`["\\n\\r${delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`);

    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const value = escapeCsvFormula(cell ?? "");
                    // Aspa interna vira `""`, que é como o próprio parser desfaz.
                    return needsQuotes.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
                })
                .join(delimiter)
        )
        .join("\r\n");
}

/** Normaliza um cabeçalho: minúsculo, sem acento e sem espaço em volta. */
function normalizeHeader(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

export interface SheetRow {
    /** Número da linha na planilha, como o casal vê (1 é o cabeçalho). */
    line: number;
    link: string;
    title: string;
    description: string;
}

const LINK_HEADERS = ["link", "url", "links", "urls", "endereco", "link do produto", "link produto"];
const TITLE_HEADERS = ["titulo", "nome", "produto", "item", "presente", "nome do produto"];
const DESCRIPTION_HEADERS = ["descricao", "detalhes", "observacao", "observacoes", "obs", "nota"];

function findColumn(headers: string[], candidates: string[]): number {
    return headers.findIndex((h) => candidates.includes(h));
}

/** Uma célula que é endereço de site — o que separa dado de cabeçalho. */
function looksLikeUrl(value: string): boolean {
    return /^https?:\/\/\S+$/i.test(value.trim());
}

/**
 * Índice da coluna que concentra os links, olhando o conteúdo.
 *
 * Serve de rede quando o cabeçalho tem um nome que não está na lista — o que é
 * comum, porque cada um escreve o seu. Devolve `-1` se nenhuma coluna tiver
 * endereço nenhum.
 */
function findLinkColumnByContent(rows: CsvRow[]): number {
    const width = Math.max(...rows.map((r) => r.length), 0);
    let best = -1;
    let bestCount = 0;

    for (let col = 0; col < width; col++) {
        const count = rows.filter((r) => looksLikeUrl(r[col] ?? "")).length;
        if (count > bestCount) {
            best = col;
            bestCount = count;
        }
    }

    return bestCount > 0 ? best : -1;
}

/**
 * Interpreta a planilha já separada em colunas.
 *
 * A existência de cabeçalho é decidida pelo **conteúdo**, não pelo nome das
 * colunas: se a primeira linha não tem nenhum endereço de site, ela é cabeçalho.
 * Antes isso dependia de reconhecer o texto do cabeçalho, e uma planilha com a
 * coluna escrita de outro jeito ("Link do item", "LINKS") fazia a primeira linha
 * ser tratada como produto — o casal via o próprio cabeçalho virar um item.
 *
 * Aceita as duas formas que aparecem na prática: com cabeçalho, em qualquer
 * ordem de colunas; e sem nenhum, um link por linha — que é como fica quando se
 * copia e cola uma coluna do navegador.
 */
export function readSheet(rows: CsvRow[]): SheetRow[] {
    if (rows.length === 0) return [];

    // Cabeçalho é uma linha sem nenhuma URL. Note que uma planilha só de links
    // (sem cabeçalho) cai no `false` aqui, que é o correto.
    const hasHeader = !rows[0].some(looksLikeUrl);

    const headers = hasHeader ? rows[0].map(normalizeHeader) : [];
    const body = hasHeader ? rows.slice(1) : rows;
    const offset = hasHeader ? 2 : 1;

    // Primeiro pelo nome do cabeçalho; se não bater, pelo conteúdo das linhas.
    let linkIndex = hasHeader ? findColumn(headers, LINK_HEADERS) : -1;
    if (linkIndex === -1) linkIndex = findLinkColumnByContent(body);
    if (linkIndex === -1) linkIndex = 0;

    let titleIndex = hasHeader ? findColumn(headers, TITLE_HEADERS) : -1;
    let descriptionIndex = hasHeader ? findColumn(headers, DESCRIPTION_HEADERS) : -1;

    // Sem cabeçalho, o que vem depois do link é assumido como título e descrição.
    if (!hasHeader) {
        titleIndex = linkIndex + 1;
        descriptionIndex = linkIndex + 2;
    }

    return body
        .map((cells, index) => ({
            line: index + offset,
            link: cells[linkIndex]?.trim() ?? "",
            // A coluna do link nunca vale como título, mesmo que o cabeçalho dela
            // case com os dois (uma coluna chamada "produto", por exemplo).
            title: titleIndex >= 0 && titleIndex !== linkIndex ? (cells[titleIndex]?.trim() ?? "") : "",
            description:
                descriptionIndex >= 0 && descriptionIndex !== linkIndex
                    ? (cells[descriptionIndex]?.trim() ?? "")
                    : "",
        }))
        .filter((r) => r.link !== "");
}
