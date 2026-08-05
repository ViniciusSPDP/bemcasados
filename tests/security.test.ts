import { test } from "node:test";
import assert from "node:assert/strict";

import { isValidCpfCnpj, maskDocument } from "../src/lib/documents";
import { mediaUrl, isSafeMediaKey, mimeForKey } from "../src/lib/media";

/**
 * Cobre a lógica pura de onde uma regressão silenciosa custaria caro:
 * validação de documento, mascaramento (LGPD) e o filtro de chave que impede
 * a rota de mídia virar um proxy para caminhos arbitrários do bucket.
 */

test("valida CPF pelo dígito verificador", () => {
    assert.equal(isValidCpfCnpj("52998224725"), true);
    assert.equal(isValidCpfCnpj("52998224726"), false, "dígito verificador errado");
    assert.equal(isValidCpfCnpj("11111111111"), false, "sequência repetida");
    assert.equal(isValidCpfCnpj("1234567890"), false, "comprimento inválido");
    assert.equal(isValidCpfCnpj(""), false);
});

test("valida CNPJ pelo dígito verificador", () => {
    assert.equal(isValidCpfCnpj("11222333000181"), true);
    assert.equal(isValidCpfCnpj("11222333000182"), false);
});

test("máscara preserva só o suficiente para conferência", () => {
    assert.equal(maskDocument("52998224725"), "•••.•••.247-••");
    assert.equal(maskDocument("11222333000181"), "••.•••.•••/0001-••");

    // O que nunca pode aparecer: os dígitos iniciais, que identificam a pessoa.
    assert.ok(!maskDocument("52998224725").includes("529"));
    assert.ok(!maskDocument("52998224725").includes("982"));
});

test("mediaUrl resolve chaves e preserva URLs absolutas", () => {
    assert.equal(
        mediaUrl("2b1f0c9a-1111-4222-8333-444455556666.jpg"),
        "/api/media/2b1f0c9a-1111-4222-8333-444455556666.jpg"
    );
    // Objetos anteriores ao fechamento do bucket usam outro formato de chave.
    assert.equal(
        mediaUrl("1768178501420-1000187008.jpg"),
        "/api/media/1768178501420-1000187008.jpg"
    );
    assert.equal(mediaUrl("https://placehold.co/600x400"), "https://placehold.co/600x400");
    assert.equal(mediaUrl("/api/media/x.jpg"), "/api/media/x.jpg", "não prefixa duas vezes");
    assert.equal(mediaUrl(null), null);
    assert.equal(mediaUrl(""), null);
});

test("isSafeMediaKey barra fuga de caminho e tipo executável", () => {
    assert.equal(isSafeMediaKey("2b1f0c9a-1111-4222-8333-444455556666.webp"), true);
    assert.equal(isSafeMediaKey("1768178501420-1000187008.jpg"), true, "chave legada");

    assert.equal(isSafeMediaKey("../../etc/passwd.jpg"), false);
    assert.equal(isSafeMediaKey("outro-bucket/segredo.jpg"), false);
    assert.equal(isSafeMediaKey("a..b.jpg"), false);
    assert.equal(isSafeMediaKey("payload.svg"), false, "SVG é XML executável");
    assert.equal(isSafeMediaKey("evil.html"), false);
    assert.equal(isSafeMediaKey(""), false);
});

test("mimeForKey aceita as extensões legadas", () => {
    assert.equal(mimeForKey("foto.JPEG"), "image/jpeg");
    assert.equal(mimeForKey("foto.jpg"), "image/jpeg");
    assert.equal(mimeForKey("foto.webp"), "image/webp");
    assert.equal(mimeForKey("foto.svg"), null);
});
