import { test } from "node:test";
import assert from "node:assert/strict";

import { toPublicExternalGift } from "../src/lib/external-gift";

const RESERVADO = {
    id: "0d1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
    title: "Air Fryer 5L",
    description: "Aquela que vimos na casa da tia",
    imageUrl: "/api/media/2b1f0c9a-1111-4222-8333-444455556666.webp",
    shortUrl: "https://meli.la/1Sq9Q2D?matt_word=abc&matt_tool=43317208",
    reservedAt: new Date("2026-08-09T12:00:00Z"),
    reservedName: "Maria Souza",
    reservedPhone: "11987654321",
    reservedMessage: "Vai fazer sucesso!",
};

test("toPublicExternalGift não deixa a reserva vazar para a página pública", () => {
    const publico = toPublicExternalGift(RESERVADO);
    const serializado = JSON.stringify(publico);

    // O payload RSC é visível em "ver código fonte" da página aberta.
    assert.ok(!serializado.includes("11987654321"), "telefone não pode sair");
    assert.ok(!serializado.includes("Maria"), "nome não pode sair");
    assert.ok(!serializado.includes("Vai fazer sucesso"), "mensagem não pode sair");

    // Lista fechada: um campo novo no modelo não entra aqui por descuido.
    assert.deepEqual(Object.keys(publico).sort(), [
        "description",
        "id",
        "imageUrl",
        "isReserved",
        "shortUrl",
        "title",
    ]);
});

test("toPublicExternalGift deriva isReserved do carimbo de data", () => {
    assert.equal(toPublicExternalGift(RESERVADO).isReserved, true);
    assert.equal(toPublicExternalGift({ ...RESERVADO, reservedAt: null }).isReserved, false);
});

test("toPublicExternalGift repassa o link curto sem tocar", () => {
    // Os parâmetros de afiliado vivem na query string: reescrever ou normalizar
    // a URL aqui perderia a comissão do casal.
    assert.equal(toPublicExternalGift(RESERVADO).shortUrl, RESERVADO.shortUrl);
});
