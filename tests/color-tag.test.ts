import { test } from "node:test";
import assert from "node:assert/strict";

import { colorSwatch, colorLabel, normalizeColorName } from "../src/lib/color-tag";

/**
 * A etiqueta de cor existe para o convidado não comprar a variação errada de um
 * anúncio do Mercado Livre. Errar aqui é pior que não ter etiqueta: uma bolinha
 * com a cor trocada é uma informação em que ele confia.
 */

test("reconhece a cor independentemente de acento, caixa e separador", () => {
    // O casal digita como quiser: "Azul Marinho", "azul-marinho", "AZUL MARINHO".
    const esperado = colorSwatch("azul marinho").hex;

    for (const escrito of ["Azul Marinho", "azul-marinho", "AZUL  MARINHO", " azul marinho "]) {
        const s = colorSwatch(escrito);
        assert.equal(s.known, true, `deveria reconhecer: ${escrito}`);
        assert.equal(s.hex, esperado, `tom divergente para: ${escrito}`);
    }
});

test("cobre as cores que aparecem de verdade em decoração", () => {
    for (const cor of ["bege", "off-white", "cru", "nude", "caramelo", "terracota", "grafite", "mostarda"]) {
        assert.equal(colorSwatch(cor).known, true, `faltou na lista: ${cor}`);
    }
});

test("nome desconhecido cai no chip neutro em vez de inventar um tom", () => {
    // O risco que isto trava: exibir uma bolinha verde para "verde-abacate-2024"
    // e o convidado comprar confiando nela.
    const s = colorSwatch("azul petróleo degradê edição 2026");

    assert.equal(s.known, false);
    assert.equal(s.hex, "#8A8F98", "chip neutro");
});

test("marca como claro o tom que precisa de contorno escuro", () => {
    // "Branco" e "off-white" somem num cartão claro sem essa distinção.
    assert.equal(colorSwatch("branco").isLight, true);
    assert.equal(colorSwatch("off-white").isLight, true);
    assert.equal(colorSwatch("bege").isLight, true);

    assert.equal(colorSwatch("preto").isLight, false);
    assert.equal(colorSwatch("azul marinho").isLight, false);
    assert.equal(colorSwatch("vinho").isLight, false);
});

test("o chip neutro nunca é tratado como claro", () => {
    // Ele carrega texto branco por cima; marcá-lo como claro apagaria o rótulo.
    assert.equal(colorSwatch("cor inexistente").isLight, false);
});

test("o rótulo preserva o que o casal escreveu, só aparando", () => {
    // A caixa alta é do CSS: o banco e o painel guardam o original.
    assert.equal(colorLabel("  Off-white  "), "Off-white");
    assert.equal(colorLabel("Azul Marinho"), "Azul Marinho");
});

test("normalizeColorName é estável para a comparação", () => {
    assert.equal(normalizeColorName("Verde-Musgo"), "verde musgo");
    assert.equal(normalizeColorName("  CHAMPANHE "), "champanhe");
});
