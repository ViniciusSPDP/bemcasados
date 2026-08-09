import { test } from "node:test";
import assert from "node:assert/strict";

import { eventDateParts, formatEventDate } from "../src/lib/event-date";

/**
 * O bug que estes testes travam saiu em produção: o casamento do Mauricio e
 * Verônica aparecia **um dia antes** na página pública, e a data foi cadastrada
 * com um dia a mais para compensar. A causa era `toLocaleDateString` sem fuso,
 * rodando no navegador do convidado — o bloco da data fica atrás do envelope,
 * então só renderiza depois da hidratação, com o fuso do celular dele.
 *
 * `process.env.TZ` é definido ANTES de qualquer formatação para simular o
 * aparelho brasileiro. Sem fixar o fuso, o teste passaria na máquina de quem
 * roda em UTC e não pegaria a regressão.
 */
process.env.TZ = "America/Sao_Paulo";

/** Como o Prisma devolve a coluna `timestamp` gravada pelo cadastro. */
const CASAMENTO = "2026-10-24T00:00:00.000Z";

test("a data não anda para trás no fuso do Brasil", () => {
    assert.equal(formatEventDate(CASAMENTO), "24 de outubro de 2026");

    // A comparação que expõe o bug: sem `timeZone: "UTC"`, o mesmo instante vira
    // o dia 23 em UTC-3.
    const semFuso = new Date(CASAMENTO).toLocaleDateString("pt-BR", { dateStyle: "long" });
    assert.notEqual(semFuso, "24 de outubro de 2026", "o teste precisa rodar em UTC-3 para valer");
});

test("os componentes do convite saem em UTC", () => {
    const parts = eventDateParts(CASAMENTO);

    assert.deepEqual(parts, { weekday: 6, month: 9, day: 24, year: 2026 }, "sábado, outubro, 24");
});

test("a virada do mês e do ano não escorrega", () => {
    // Onde o erro de fuso dói mais: o dia 1º volta para o mês anterior.
    assert.equal(formatEventDate("2026-01-01T00:00:00.000Z"), "1 de janeiro de 2026");
    assert.equal(eventDateParts("2026-01-01T00:00:00.000Z").year, 2026);
    assert.equal(formatEventDate("2026-11-01T00:00:00.000Z"), "1 de novembro de 2026");
});

test("aceita o Date do Prisma além da string ISO", () => {
    // A página pública recebe ISO (atravessou a fronteira server→client) e o
    // painel tem o `Date` na mão. As duas entradas precisam dar o mesmo dia.
    assert.equal(formatEventDate(new Date(CASAMENTO)), formatEventDate(CASAMENTO));
});
