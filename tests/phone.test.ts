import { test } from "node:test";
import assert from "node:assert/strict";

import { onlyDigits, isValidBrazilianPhone, formatPhone } from "../src/lib/phone";

/**
 * O telefone é o único dado pessoal novo que a vitrine coleta. Guardar só
 * dígitos é o que impede o mesmo número de virar cinco registros diferentes, e
 * a validação é o que evita o casal ficar com um contato impossível de usar.
 */

test("onlyDigits descarta tudo que não é número", () => {
    assert.equal(onlyDigits("(11) 98765-4321"), "11987654321");
    assert.equal(onlyDigits("11.98765.4321"), "11987654321");
    assert.equal(onlyDigits(""), "");
    assert.equal(onlyDigits("sem número"), "");
});

test("onlyDigits remove o +55 que o autofill do celular acrescenta", () => {
    assert.equal(onlyDigits("+55 11 98765 4321"), "11987654321", "celular com DDI");
    assert.equal(onlyDigits("+55 11 3265-4321"), "1132654321", "fixo com DDI");

    // 11 dígitos começando com 55 é DDD 55 (Santa Maria/RS), não código do país.
    assert.equal(onlyDigits("55999887766"), "55999887766", "DDD 55 é preservado");
});

test("isValidBrazilianPhone aceita celular e fixo", () => {
    assert.equal(isValidBrazilianPhone("11987654321"), true, "celular de São Paulo");
    assert.equal(isValidBrazilianPhone("1132654321"), true, "fixo de São Paulo");
    assert.equal(isValidBrazilianPhone("85988887777"), true, "celular de Fortaleza");
    assert.equal(isValidBrazilianPhone("4832101234"), true, "fixo de Florianópolis");
});

test("isValidBrazilianPhone recusa o que não é telefone", () => {
    assert.equal(isValidBrazilianPhone("119876543"), false, "curto demais");
    assert.equal(isValidBrazilianPhone("119876543210"), false, "longo demais");
    assert.equal(isValidBrazilianPhone(""), false);

    // O erro mais comum: o "0" de interurbano na frente do DDD produz 10
    // dígitos, que passariam num teste só de comprimento.
    assert.equal(isValidBrazilianPhone("0987654321"), false, "DDD 09 não existe");
    assert.equal(isValidBrazilianPhone("2087654321"), false, "DDD 20 não existe");
    assert.equal(isValidBrazilianPhone("10987654321"), false, "DDD 10 não existe");

    assert.equal(isValidBrazilianPhone("11111111111"), false, "sequência repetida");
    // Chega aqui só se `onlyDigits` não tiver rodado antes; o contrato é dígitos
    // nacionais, como em `documents.ts`.
    assert.equal(isValidBrazilianPhone("5511987654321"), false, "13 dígitos não é telefone nacional");

    // Celular sem o nono dígito: 11 posições mas o terceiro não é 9.
    assert.equal(isValidBrazilianPhone("11887654321"), false, "11 dígitos sem o 9 obrigatório");
    // Fixo não começa em 9: isso seria um celular truncado.
    assert.equal(isValidBrazilianPhone("1198765432"), false, "celular sem o nono dígito");
});

test("formatPhone monta a máscara e não quebra com entrada estranha", () => {
    assert.equal(formatPhone("11987654321"), "(11) 98765-4321");
    assert.equal(formatPhone("1132654321"), "(11) 3265-4321");
    assert.equal(formatPhone("123"), "123", "fora do padrão volta como está");
    assert.equal(formatPhone(""), "");
});
