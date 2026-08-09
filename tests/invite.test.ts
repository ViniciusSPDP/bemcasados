import { test } from "node:test";
import assert from "node:assert/strict";

import { CeremonyMapsUrlSchema, CeremonyTimeSchema } from "../src/lib/definitions";

/**
 * O link do mapa é o único campo do convite que leva o convidado para fora do
 * nosso domínio. Sem a allowlist, o convite viraria um redirecionador — e o
 * convidado clicaria confiando na página do casamento.
 */

test("link do mapa aceita os serviços conhecidos", () => {
    for (const url of [
        "https://maps.app.goo.gl/AbCdEf123",
        "https://www.google.com/maps/place/Igreja",
        "https://goo.gl/maps/xyz",
        "https://www.openstreetmap.org/#map=19/-23.5/-46.6",
        "https://waze.com/ul/h6gycrs2s3",
        "https://maps.apple.com/?ll=-23.5,-46.6",
        "",
    ]) {
        assert.equal(
            CeremonyMapsUrlSchema.safeParse(url).success,
            true,
            `deveria aceitar: ${url || "(vazio)"}`
        );
    }
});

test("link do mapa barra host forjado e endereço arbitrário", () => {
    for (const url of [
        "https://google.com.evil.io/maps",
        "https://notgoogle.com/maps",
        "https://evil.com/maps",
        "http://maps.app.goo.gl/AbCdEf",
        "javascript:alert(1)",
        "nao-e-url",
    ]) {
        assert.equal(
            CeremonyMapsUrlSchema.safeParse(url).success,
            false,
            `deveria recusar: ${url}`
        );
    }
});

test("horário da cerimônia aceita HH:MM em 24h e recusa o resto", () => {
    for (const t of ["20:30", "00:00", "23:59", "09:05", ""]) {
        assert.equal(CeremonyTimeSchema.safeParse(t).success, true, `deveria aceitar: ${t || "(vazio)"}`);
    }
    for (const t of ["24:00", "20:60", "8:30", "20h30", "2030", "abc"]) {
        assert.equal(CeremonyTimeSchema.safeParse(t).success, false, `deveria recusar: ${t}`);
    }
});
