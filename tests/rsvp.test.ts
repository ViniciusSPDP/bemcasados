import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { RsvpSchema, UpdateRsvpSchema, MAX_COMPANIONS } from "../src/lib/definitions";
import {
    countPeople,
    findPossibleDuplicates,
    normalizeName,
    rsvpsToCsvRows,
    summarizeRsvps,
    toAdminRsvp,
    type AdminRsvp,
    type RsvpRow,
} from "../src/lib/rsvp";
import { parseCsv, toCsv } from "../src/lib/csv";

/**
 * A confirmação de presença é escrita por qualquer pessoa com o link do convite,
 * sem cadastro. Três coisas quebram em silêncio se regredirem: a contagem de
 * pessoas (o casal fecha o bufê por ela), a chave que impede duplicata, e a
 * fronteira que mantém a lista fora de qualquer página pública.
 */

const BASE = {
    slug: "casamento-principal",
    name: "Maria Souza",
    phone: "(11) 98765-4321",
    status: "SIM",
    message: "",
    companions: [] as string[],
};

/* ------------------------------------------------------------------------- */
/* Schema                                                                     */
/* ------------------------------------------------------------------------- */

test("telefone é normalizado a dígitos, inclusive com o +55 do autofill", () => {
    // Sem isto o mesmo número entraria como duas pessoas diferentes — e aqui
    // ele é a CHAVE da confirmação, então duplicaria a linha em vez de corrigir.
    for (const entrada of ["(11) 98765-4321", "11 98765 4321", "+55 11 98765-4321", "11987654321"]) {
        const parsed = RsvpSchema.safeParse({ ...BASE, phone: entrada });
        assert.equal(parsed.success, true, `deveria aceitar: ${entrada}`);
        assert.equal(parsed.data?.phone, "11987654321", `normalização errada: ${entrada}`);
    }
});

test("telefone inválido é recusado com mensagem, não com erro genérico", () => {
    for (const entrada of ["", "9999", "01187654321", "11887654321", "11111111111"]) {
        const parsed = RsvpSchema.safeParse({ ...BASE, phone: entrada });
        assert.equal(parsed.success, false, `deveria recusar: ${entrada || "(vazio)"}`);
    }
});

test("nome curto e status ausente são recusados", () => {
    assert.equal(RsvpSchema.safeParse({ ...BASE, name: "Jo" }).success, false);
    assert.equal(RsvpSchema.safeParse({ ...BASE, status: "" }).success, false);
    assert.equal(RsvpSchema.safeParse({ ...BASE, status: "TALVEZ" }).success, false);
});

test("acompanhante em branco é descartado antes de contar para o teto", () => {
    // O convidado clica em "adicionar" e não preenche. Recusar a confirmação
    // inteira por isso seria hostil — e ele não teria como descobrir o motivo.
    const parsed = RsvpSchema.safeParse({
        ...BASE,
        companions: ["João Souza", "   ", "", "Ana Souza"],
    });

    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data?.companions, ["João Souza", "Ana Souza"]);
});

test(`recusa mais de ${MAX_COMPANIONS} acompanhantes`, () => {
    const seis = ["Um", "Dois", "Três", "Quatro", "Cinco", "Seis"].map((n) => `${n} Silva`);
    const parsed = RsvpSchema.safeParse({ ...BASE, companions: seis });

    assert.equal(parsed.success, false);
    assert.match(parsed.error?.issues[0]?.message ?? "", /acompanhantes/);
});

test('"não vou" zera os acompanhantes no servidor', () => {
    // O formulário esconde os campos, mas quem manda o POST à mão não esconde.
    const parsed = RsvpSchema.safeParse({
        ...BASE,
        status: "NAO",
        companions: ["João Souza", "Ana Souza"],
    });

    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data?.companions, []);
});

test("o slug do convite é validado antes de virar consulta", () => {
    for (const slug of ["ab", "Casamento Principal", "../admin", "casa/mento"]) {
        assert.equal(
            RsvpSchema.safeParse({ ...BASE, slug }).success,
            false,
            `deveria recusar: ${slug}`
        );
    }
});

/* ------------------------------------------------------------------------- */
/* Edição pelo painel                                                         */
/* ------------------------------------------------------------------------- */

const EDICAO = {
    id: "0d1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
    name: "Maria Souza",
    phone: "(11) 98765-4321",
    status: "SIM",
    message: "",
    companions: [] as string[],
};

test("a edição do painel aplica exatamente as mesmas regras da confirmação", () => {
    // As duas entradas escrevem na MESMA tabela. Se a do painel fosse mais
    // frouxa, ela viraria o caminho para gravar o que o zod público recusa.
    const casos: Array<Record<string, unknown>> = [
        { name: "Jo" },
        { phone: "9999" },
        { status: "TALVEZ" },
        { companions: ["Um", "Dois", "Três", "Quatro", "Cinco", "Seis"].map((n) => `${n} Silva`) },
        { message: "x".repeat(501) },
    ];

    for (const caso of casos) {
        assert.equal(
            UpdateRsvpSchema.safeParse({ ...EDICAO, ...caso }).success,
            false,
            `a edição deveria recusar: ${JSON.stringify(caso).slice(0, 60)}`
        );
        assert.equal(
            RsvpSchema.safeParse({ ...BASE, ...caso }).success,
            false,
            `a confirmação deveria recusar o mesmo: ${JSON.stringify(caso).slice(0, 60)}`
        );
    }
});

test("a edição normaliza o telefone e zera acompanhante ao marcar 'não vai'", () => {
    // O casal reescreve o telefone com máscara; ele é a chave única, então
    // precisa chegar em dígitos como o do convidado.
    const corrigido = UpdateRsvpSchema.safeParse({ ...EDICAO, phone: "+55 (11) 98765-4321" });
    assert.equal(corrigido.data?.phone, "11987654321");

    const desistiu = UpdateRsvpSchema.safeParse({
        ...EDICAO,
        status: "NAO",
        companions: ["João Souza"],
    });
    assert.deepEqual(desistiu.data?.companions, []);
});

test("a edição exige um id de confirmação, não um slug", () => {
    assert.equal(UpdateRsvpSchema.safeParse({ ...EDICAO, id: "casamento-principal" }).success, false);
    assert.equal(UpdateRsvpSchema.safeParse({ ...EDICAO, id: "" }).success, false);
});

/* ------------------------------------------------------------------------- */
/* Contagem                                                                   */
/* ------------------------------------------------------------------------- */

// `Partial<RsvpRow>` e não `Partial<AdminRsvp>`: o helper alimenta a barreira
// com a linha CRUA do banco, onde `status` ainda é uma string qualquer — é
// justamente o que os testes de status desconhecido precisam poder passar.
function rsvp(over: Partial<RsvpRow> = {}): AdminRsvp {
    return toAdminRsvp({
        id: "0d1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
        name: "Maria Souza",
        phone: "11987654321",
        status: "SIM",
        message: null,
        companions: [],
        createdAt: new Date(2026, 7, 9, 20, 30),
        ...over,
    });
}

test("total de pessoas é quem respondeu MAIS os acompanhantes", () => {
    assert.equal(countPeople(rsvp()), 1, "sozinho conta 1");
    assert.equal(countPeople(rsvp({ companions: ["João", "Ana"] })), 3);
});

test("o resumo separa pessoas de respostas e não conta quem não vai", () => {
    const summary = summarizeRsvps([
        rsvp({ companions: ["João", "Ana"] }), // 3 pessoas
        rsvp({ companions: ["Pedro"] }), //        2 pessoas
        rsvp({ status: "NAO" }), //                recusa
        // Recusa com acompanhante gravado de uma resposta anterior: não pode
        // somar ninguém ao bufê.
        rsvp({ status: "NAO", companions: ["Carla"] }),
    ]);

    assert.equal(summary.confirmedPeople, 5, "é este o número que vai ao bufê");
    assert.equal(summary.declined, 2);
    assert.equal(summary.responses, 4);
    assert.equal(summary.companions, 3, "acompanhantes só de quem vai");
});

test("status desconhecido é lido como recusa, nunca como presença", () => {
    // Contar como presente quem não confirmou faria o casal pagar prato a mais.
    assert.equal(rsvp({ status: "qualquer-coisa" }).status, "NAO");
    assert.equal(rsvp({ status: "sim" }).status, "NAO", "a comparação é exata");
});

/* ------------------------------------------------------------------------- */
/* Pessoa contada duas vezes                                                  */
/* ------------------------------------------------------------------------- */

test("aponta quem já era acompanhante e confirmou por conta própria", () => {
    // O caso real: o link do convite é um só. A tia confirma e inclui o tio;
    // ele recebe o mesmo link e confirma com o telefone dele. São duas linhas,
    // e o total que vai ao bufê sobe sem ninguém perceber.
    const tia = rsvp({ id: "aaaaaaaa-0000-4000-8000-000000000001", name: "Maria Souza", companions: ["Roberto Souza"] });
    const tio = rsvp({ id: "bbbbbbbb-0000-4000-8000-000000000002", name: "Roberto Souza" });
    const outra = rsvp({ id: "cccccccc-0000-4000-8000-000000000003", name: "Carla Dias" });

    const dup = findPossibleDuplicates([tia, tio, outra]);

    assert.deepEqual(dup[tio.id], ["Maria Souza"], "o tio precisa ser apontado");
    assert.equal(dup[tia.id], undefined, "a tia não está duplicada");
    assert.equal(dup[outra.id], undefined);
});

test("a comparação ignora acento, caixa e espaço repetido", () => {
    // A tia digita de um jeito, ele se cadastra de outro. Comparação literal
    // deixaria a duplicata passar batido, que é justamente o que o aviso evita.
    const tia = rsvp({ id: "aaaaaaaa-0000-4000-8000-000000000001", name: "Ana", companions: ["José  da Silva"] });
    const ele = rsvp({ id: "bbbbbbbb-0000-4000-8000-000000000002", name: "jose da silva" });

    assert.deepEqual(findPossibleDuplicates([tia, ele])[ele.id], ["Ana"]);
    assert.equal(normalizeName("José  da Silva"), "jose da silva");
});

test("não acusa quem se colocou como próprio acompanhante", () => {
    // Engano comum ao preencher, mas é uma pessoa só — acusar aqui mandaria o
    // casal apagar a confirmação inteira.
    const sozinho = rsvp({ name: "Maria Souza", companions: ["Maria Souza"] });

    assert.deepEqual(findPossibleDuplicates([sozinho]), {});
});

test("aponta as duas origens quando mais de uma pessoa listou a mesma", () => {
    const tia = rsvp({ id: "aaaaaaaa-0000-4000-8000-000000000001", name: "Maria", companions: ["Roberto Souza"] });
    const primo = rsvp({ id: "bbbbbbbb-0000-4000-8000-000000000002", name: "Pedro", companions: ["Roberto Souza"] });
    const tio = rsvp({ id: "cccccccc-0000-4000-8000-000000000003", name: "Roberto Souza" });

    assert.deepEqual(findPossibleDuplicates([tia, primo, tio])[tio.id], ["Maria", "Pedro"]);
});

/* ------------------------------------------------------------------------- */
/* Fronteira server → client                                                  */
/* ------------------------------------------------------------------------- */

test("toAdminRsvp tem lista de campos fechada", () => {
    const admin = toAdminRsvp({
        id: "0d1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
        name: "Maria Souza",
        phone: "11987654321",
        status: "SIM",
        message: "Mal posso esperar",
        companions: ["João"],
        createdAt: new Date(2026, 7, 9, 20, 30),
        eventId: "1e2d3c4b-5a69-4788-9a0b-1c2d3e4f5a6b",
    });

    // Um campo novo no modelo não entra no payload do painel por descuido.
    assert.deepEqual(Object.keys(admin).sort(), [
        "companions",
        "createdAt",
        "id",
        "message",
        "name",
        "phone",
        "status",
    ]);
    assert.ok(!JSON.stringify(admin).includes("1e2d3c4b"), "eventId não atravessa");
});

test("nenhuma página pública consulta a tabela de presenças", () => {
    // Esta é a regra que sustenta a promessa feita ao convidado na tela e na
    // política de privacidade: a lista só existe no painel. O convidado escreve
    // por uma Server Action (`src/actions/`), nunca por uma leitura da página.
    const raiz = join(process.cwd(), "src", "app", "(public)");
    const suspeitos: string[] = [];

    const varrer = (dir: string) => {
        for (const entrada of readdirSync(dir)) {
            const caminho = join(dir, entrada);
            if (statSync(caminho).isDirectory()) {
                varrer(caminho);
            } else if (/\.tsx?$/.test(entrada)) {
                if (/prisma\.rsvp\b/.test(readFileSync(caminho, "utf8"))) {
                    suspeitos.push(caminho);
                }
            }
        }
    };

    varrer(raiz);

    assert.deepEqual(suspeitos, [], "página pública não pode ler prisma.rsvp");
});

/* ------------------------------------------------------------------------- */
/* Exportação                                                                 */
/* ------------------------------------------------------------------------- */

test("o CSV traz a coluna de pessoas somada e volta pelo parser", () => {
    const linhas = rsvpsToCsvRows([
        rsvp({ name: "Maria Souza", companions: ["João Souza", "Ana Souza"], message: "Vamos!" }),
        rsvp({ name: "Carlos Lima", status: "NAO", message: null }),
    ]);

    // O arquivo exportado tem que ser legível pelo parser que já existe.
    const voltou = parseCsv(toCsv(linhas));

    assert.deepEqual(voltou[0], [
        "nome",
        "telefone",
        "status",
        "pessoas",
        "acompanhantes",
        "recado",
        "data",
    ]);
    assert.deepEqual(voltou[1], [
        "Maria Souza",
        "(11) 98765-4321",
        "Vai",
        "3",
        "João Souza, Ana Souza",
        "Vamos!",
        "09/08/2026 20:30",
    ]);
    assert.deepEqual(voltou[2], [
        "Carlos Lima",
        "(11) 98765-4321",
        "Não vai",
        "1",
        "",
        "",
        "09/08/2026 20:30",
    ]);
});

test("nome que parece fórmula chega ao Excel como texto", () => {
    // O nome vem de um formulário público e anônimo, e a planilha é aberta na
    // máquina do casal: `=cmd|...` não pode ser avaliado como fórmula.
    const csv = toCsv(rsvpsToCsvRows([rsvp({ name: "=cmd|'/c calc'!A1" })]));

    assert.ok(csv.includes("'=cmd"), "prefixo de texto ausente");
    assert.ok(!/(^|;)=cmd/m.test(csv), "nenhuma célula pode começar com =");
});
