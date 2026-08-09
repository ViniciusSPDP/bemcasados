import { test } from "node:test";
import assert from "node:assert/strict";

import { parseCsv, readSheet, toCsv, escapeCsvFormula } from "../src/lib/csv";

/**
 * A planilha vem do Excel ou do Google Sheets do casal, e as duas ferramentas
 * exportam de jeitos diferentes. Um erro aqui não dá erro visível: some ou
 * embaralha item, e o casal só descobre quando o convidado reclama.
 */

test("detecta o separador do Excel em português (;) e do Sheets (,)", () => {
    // No Excel brasileiro a vírgula é o separador decimal, então o CSV sai com `;`.
    assert.deepEqual(parseCsv("link;titulo\nhttps://meli.la/a;Air Fryer"), [
        ["link", "titulo"],
        ["https://meli.la/a", "Air Fryer"],
    ]);

    assert.deepEqual(parseCsv("link,titulo\nhttps://meli.la/a,Air Fryer"), [
        ["link", "titulo"],
        ["https://meli.la/a", "Air Fryer"],
    ]);
});

test("respeita aspas, separador dentro do texto e aspas escapadas", () => {
    const csv = 'link,titulo\nhttps://meli.la/a,"Panela 20cm, antiaderente"';
    assert.deepEqual(parseCsv(csv)[1], ["https://meli.la/a", "Panela 20cm, antiaderente"]);

    const escaped = 'link,titulo\nhttps://meli.la/a,"Jogo ""Premium"" 10 peças"';
    assert.deepEqual(parseCsv(escaped)[1], ["https://meli.la/a", 'Jogo "Premium" 10 peças']);
});

test("aguenta o que o Excel realmente grava: BOM, CRLF e linhas vazias no fim", () => {
    const csv = "﻿link;titulo\r\nhttps://meli.la/a;Air Fryer\r\n\r\n;\r\n";
    const rows = parseCsv(csv);

    assert.equal(rows.length, 2, "linhas em branco no fim são descartadas");
    assert.deepEqual(rows[0], ["link", "titulo"], "o BOM não gruda no primeiro cabeçalho");
    assert.deepEqual(rows[1], ["https://meli.la/a", "Air Fryer"]);
});

test("readSheet aceita cabeçalho em qualquer ordem, com ou sem acento", () => {
    const rows = parseCsv("Título;Link;Descrição\nAir Fryer;https://meli.la/a;Aquela da tia");
    const sheet = readSheet(rows);

    assert.equal(sheet.length, 1);
    assert.deepEqual(sheet[0], {
        line: 2,
        link: "https://meli.la/a",
        title: "Air Fryer",
        description: "Aquela da tia",
    });
});

test("readSheet aceita planilha só de links, sem cabeçalho", () => {
    // É o que sai quando o casal copia uma coluna e cola.
    const sheet = readSheet(parseCsv("https://meli.la/a\nhttps://meli.la/b"));

    assert.equal(sheet.length, 2);
    assert.equal(sheet[0].link, "https://meli.la/a");
    assert.equal(sheet[0].line, 1, "sem cabeçalho, a primeira linha já é item");
    assert.equal(sheet[0].title, "", "não inventa título a partir do link");
    assert.equal(sheet[1].line, 2);
});

test("readSheet numera as linhas como a planilha mostra e pula as vazias", () => {
    const sheet = readSheet(parseCsv("link;titulo\nhttps://meli.la/a;A\n;\nhttps://meli.la/b;B"));

    assert.equal(sheet.length, 2, "linha sem link não vira item");
    // A referência precisa bater com o que o casal vê ao abrir o arquivo, senão
    // o relatório de erro aponta para a linha errada.
    assert.equal(sheet[0].line, 2);
    assert.equal(sheet[1].line, 4);
});

test("readSheet reconhece cabeçalho com qualquer nome, sem virar item", () => {
    // O bug que isto trava: nomes fora da lista faziam o cabeçalho ser tratado
    // como produto, e o casal via "Link do Produto" virar um item da vitrine.
    for (const header of [
        "Link do Produto;Nome do item",
        "LINKS;PRESENTE",
        "endereço web;o que é",
        "coluna A;coluna B",
    ]) {
        const sheet = readSheet(parseCsv(`${header}\nhttps://meli.la/a;Air Fryer`));

        assert.equal(sheet.length, 1, `cabeçalho "${header}" não podia virar item`);
        assert.equal(sheet[0].link, "https://meli.la/a");
        assert.equal(sheet[0].line, 2);
    }
});

test("readSheet acha a coluna do link mesmo fora da primeira posição", () => {
    const sheet = readSheet(
        parseCsv("Item;Observação;Endereço na loja\nAir Fryer;Da tia;https://meli.la/a")
    );

    assert.equal(sheet.length, 1);
    assert.equal(sheet[0].link, "https://meli.la/a", "encontrada pelo conteúdo, não pelo nome");
});

test("readSheet devolve vazio para entrada vazia", () => {
    assert.deepEqual(readSheet(parseCsv("")), []);
    assert.deepEqual(readSheet(parseCsv("   \n  \n")), []);
});

test("toCsv escreve o que o parseCsv lê de volta", () => {
    // O que sai da exportação precisa entrar de novo sem perda: é o mesmo
    // formato dos dois lados, e é isso que permite o casal editar e reimportar.
    const linhas = [
        ["nome", "telefone", "recado"],
        ["Maria Souza", "(11) 98765-4321", "Panela 20cm, antiaderente"],
        ["João", "(11) 3333-4444", 'Disse "vamos" e sumiu'],
        ["Ana", "", "linha 1\nlinha 2"],
    ];

    assert.deepEqual(parseCsv(toCsv(linhas)), linhas);
});

test("toCsv usa ; por padrão e termina as linhas em CRLF", () => {
    // `;` é o que o Excel em português espera; CRLF é o que ele grava.
    assert.equal(toCsv([["a", "b"], ["c", "d"]]), "a;b\r\nc;d");
    assert.equal(toCsv([["a", "b"]], ","), "a,b");
});

test("escapeCsvFormula neutraliza célula que o Excel executaria", () => {
    // A planilha é montada com texto de formulário público e aberta na máquina
    // do casal — uma célula que começa com `=` é avaliada pelo Excel.
    for (const perigoso of ["=1+1", "+1", "-1", "@SUM(A1)", "\t=1+1"]) {
        assert.equal(escapeCsvFormula(perigoso), `'${perigoso}`, `não neutralizou: ${perigoso}`);
    }

    // Texto normal não pode ganhar aspa simples pendurada na frente.
    for (const seguro of ["Maria Souza", "(11) 98765-4321", "3", ""]) {
        assert.equal(escapeCsvFormula(seguro), seguro, `não devia mexer em: ${seguro}`);
    }
});
