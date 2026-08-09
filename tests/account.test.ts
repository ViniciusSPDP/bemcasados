import { test } from "node:test";
import assert from "node:assert/strict";

import {
    UpdateSlugSchema,
    ChangePasswordSchema,
    UpdateWeddingSchema,
} from "../src/lib/definitions";

/**
 * Estes campos mudam como se entra na conta e qual é o endereço público do
 * casamento. A validação é a mesma do cadastro de propósito: se divergissem, o
 * painel aceitaria um estado que o cadastro recusaria.
 */

test("slug recusa endereço reservado e formato inválido", () => {
    // Sem esta lista, um casal registraria `admin` e a página pública dele
    // passaria a disputar a rota do painel.
    for (const slug of ["admin", "login", "api", "termos-de-uso", "politica-de-privacidade"]) {
        assert.equal(
            UpdateSlugSchema.safeParse({ slug }).success,
            false,
            `deveria recusar reservado: ${slug}`
        );
    }

    for (const slug of ["ab", "com espaço", "MAIÚSCULO_", "acentuação", "barra/dentro", ""]) {
        assert.equal(
            UpdateSlugSchema.safeParse({ slug }).success,
            false,
            `deveria recusar formato: "${slug}"`
        );
    }

    assert.equal(UpdateSlugSchema.safeParse({ slug: "joana-e-junior" }).success, true);
    assert.equal(
        UpdateSlugSchema.safeParse({ slug: "  Joana-E-Junior  " }).data?.slug,
        "joana-e-junior",
        "normaliza espaço e maiúsculas em vez de recusar"
    );
});

test("troca de senha exige senha forte, confirmação e senha diferente da atual", () => {
    const base = { currentPassword: "SenhaAtual1!", newPassword: "NovaSenha1!", confirmPassword: "NovaSenha1!" };

    assert.equal(ChangePasswordSchema.safeParse(base).success, true);

    assert.equal(
        ChangePasswordSchema.safeParse({ ...base, confirmPassword: "Outra1!" }).success,
        false,
        "confirmação diferente"
    );
    assert.equal(
        ChangePasswordSchema.safeParse({ ...base, newPassword: "SenhaAtual1!", confirmPassword: "SenhaAtual1!" })
            .success,
        false,
        "nova igual à atual"
    );
    assert.equal(
        ChangePasswordSchema.safeParse({ ...base, currentPassword: "" }).success,
        false,
        "senha atual em branco"
    );

    // Mesmas regras de complexidade do cadastro.
    for (const fraca of ["curta1!", "semmaiuscula1!", "SEMMINUSCULA1!", "SemNumero!!", "SemSimbolo11"]) {
        assert.equal(
            ChangePasswordSchema.safeParse({ ...base, newPassword: fraca, confirmPassword: fraca }).success,
            false,
            `deveria recusar: ${fraca}`
        );
    }
});

test("data do casamento vira meia-noite UTC, para o convite não mostrar o dia anterior", () => {
    const ok = UpdateWeddingSchema.safeParse({
        coupleName: "Joana & Junior",
        title: "Nosso Casamento",
        eventDate: "2026-05-08",
    });

    assert.equal(ok.success, true);
    assert.equal(ok.data?.eventDate.toISOString(), "2026-05-08T00:00:00.000Z");

    for (const data of ["08/05/2026", "2026-13-01", "", "amanhã"]) {
        assert.equal(
            UpdateWeddingSchema.safeParse({ coupleName: "A & B", title: "Casamento", eventDate: data }).success,
            false,
            `deveria recusar data: "${data}"`
        );
    }
});
