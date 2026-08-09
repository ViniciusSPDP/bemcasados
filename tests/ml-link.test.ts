import { test } from "node:test";
import assert from "node:assert/strict";

import {
    isAllowedLinkHost,
    isAllowedImageHost,
    isBlockedIp,
    extractMlbId,
    parseOpenGraph,
    sanitizeMlText,
} from "../src/lib/ml-link";

/**
 * Esta é a superfície de SSRF do projeto: o servidor busca uma URL que o
 * usuário colou, de dentro de uma VPS que enxerga o painel do EasyPanel, o
 * Postgres, o MinIO e o 169.254.169.254. Cada teste aqui cobre um jeito
 * conhecido de furar a allowlist.
 */

test("isAllowedLinkHost aceita os domínios do Mercado Livre", () => {
    assert.equal(isAllowedLinkHost("meli.la"), true);
    assert.equal(isAllowedLinkHost("mercadolivre.com.br"), true);
    assert.equal(isAllowedLinkHost("www.mercadolivre.com.br"), true);
    assert.equal(isAllowedLinkHost("produto.mercadolivre.com.br"), true);
    assert.equal(isAllowedLinkHost("mercadolibre.com"), true);
    assert.equal(isAllowedLinkHost("MELI.LA"), true, "case-insensitive");
    assert.equal(isAllowedLinkHost("meli.la."), true, "ponto final é o mesmo nome no DNS");
});

test("isAllowedLinkHost barra sufixo forjado e endereço interno", () => {
    // O ataque clássico: registrar um domínio que TERMINA com o nome esperado.
    assert.equal(isAllowedLinkHost("meli.la.evil.com"), false);
    assert.equal(isAllowedLinkHost("mercadolivre.com.br.evil.com"), false);
    // E o inverso: um domínio que CONTÉM o nome esperado.
    assert.equal(isAllowedLinkHost("notmeli.la"), false);
    assert.equal(isAllowedLinkHost("evilmercadolivre.com.br"), false);

    assert.equal(isAllowedLinkHost("evil.com"), false);
    assert.equal(isAllowedLinkHost("localhost"), false);
    assert.equal(isAllowedLinkHost("169.254.169.254"), false);
    assert.equal(isAllowedLinkHost(""), false);
});

test("isAllowedImageHost cobre só o CDN do ML", () => {
    assert.equal(isAllowedImageHost("http2.mlstatic.com"), true);
    assert.equal(isAllowedImageHost("mlstatic.com"), true);

    assert.equal(isAllowedImageHost("http2.mlstatic.com.evil.com"), false);
    assert.equal(isAllowedImageHost("mlstatic.com.br"), false);
    assert.equal(isAllowedImageHost("evil.com"), false);
});

test("isBlockedIp recusa as faixas internas de IPv4", () => {
    assert.equal(isBlockedIp("127.0.0.1"), true, "loopback");
    assert.equal(isBlockedIp("10.0.0.1"), true, "privado");
    assert.equal(isBlockedIp("172.16.0.1"), true, "privado");
    assert.equal(isBlockedIp("172.31.255.255"), true, "fim da faixa 172.16/12");
    assert.equal(isBlockedIp("192.168.1.1"), true, "privado");
    assert.equal(isBlockedIp("169.254.169.254"), true, "metadados de nuvem");
    assert.equal(isBlockedIp("100.64.0.1"), true, "CGNAT");
    assert.equal(isBlockedIp("0.0.0.0"), true);
    assert.equal(isBlockedIp("224.0.0.1"), true, "multicast");
    assert.equal(isBlockedIp("255.255.255.255"), true, "broadcast");

    assert.equal(isBlockedIp("8.8.8.8"), false);
    assert.equal(isBlockedIp("172.32.0.1"), false, "logo depois da faixa privada");
    assert.equal(isBlockedIp("200.150.10.1"), false);
});

test("isBlockedIp recusa IPv6 interno e as formas que embutem IPv4", () => {
    assert.equal(isBlockedIp("::1"), true, "loopback");
    assert.equal(isBlockedIp("::"), true, "não especificado");
    assert.equal(isBlockedIp("fe80::1"), true, "link-local");
    assert.equal(isBlockedIp("fe80::1%eth0"), true, "link-local com zone id");
    assert.equal(isBlockedIp("fc00::1"), true, "ULA");
    assert.equal(isBlockedIp("fd12:3456::1"), true, "ULA");
    assert.equal(isBlockedIp("ff02::1"), true, "multicast");

    // As formas mapeadas são o ponto cego clássico: as três abaixo são 127.0.0.1
    // e 169.254.169.254 escritas de outro jeito.
    assert.equal(isBlockedIp("::ffff:127.0.0.1"), true, "IPv4-mapped pontuado");
    assert.equal(isBlockedIp("::ffff:7f00:1"), true, "IPv4-mapped em hexa");
    assert.equal(isBlockedIp("::ffff:a9fe:a9fe"), true, "169.254.169.254 em hexa");
    assert.equal(isBlockedIp("::127.0.0.1"), true, "IPv4-compatible (obsoleta)");
    assert.equal(isBlockedIp("64:ff9b::7f00:1"), true, "NAT64");
    assert.equal(isBlockedIp("2002:7f00:0001::"), true, "6to4 embutindo 127.0.0.1");

    assert.equal(isBlockedIp("2001:4860:4860::8888"), false, "DNS público do Google");
});

test("isBlockedIp fecha no que não consegue interpretar", () => {
    assert.equal(isBlockedIp(""), true);
    assert.equal(isBlockedIp("não-é-ip"), true);
    assert.equal(isBlockedIp("1.2.3"), true);
    assert.equal(isBlockedIp("999.1.1.1"), true);
    // Formas octais/hexa de 127.0.0.1 que algumas bibliotecas aceitam.
    assert.equal(isBlockedIp("0177.0.0.1"), true);
    assert.equal(isBlockedIp("2130706433"), true);
});

test("extractMlbId pega o id do anúncio e ignora o de catálogo", () => {
    assert.equal(
        extractMlbId("https://produto.mercadolivre.com.br/MLB-1234567890-air-fryer-5l/"),
        "MLB1234567890"
    );
    assert.equal(extractMlbId("https://www.mercadolivre.com.br/p/MLB12345678"), "MLB12345678");

    // `/up/MLBU…` é página de catálogo, não item: deduplicar por ele juntaria
    // produtos diferentes.
    assert.equal(extractMlbId("https://www.mercadolivre.com.br/algo/up/MLBU2800301877"), null);

    // O link curto não carrega o id — é justamente por isso que resolvê-lo tem valor.
    assert.equal(extractMlbId("https://meli.la/1Sq9Q2D"), null);
    assert.equal(extractMlbId("https://exemplo.com/produto"), null);
});

test("parseOpenGraph lê a tag em qualquer formato e não quebra sem ela", () => {
    const html = `
        <meta property="og:title" content="Air Fryer 5L" />
        <meta content='Uma boa fritadeira &amp; tanto' property='og:description'>
        <meta name="og:image" content="https://http2.mlstatic.com/foto.webp">
    `;
    const og = parseOpenGraph(html);

    assert.equal(og.title, "Air Fryer 5L");
    assert.equal(og.description, "Uma boa fritadeira & tanto", "atributos em ordem invertida e entidade");
    assert.equal(og.image, "https://http2.mlstatic.com/foto.webp", "aceita name= além de property=");

    // O caso real de hoje: o ML manda a página de verificação anti-bot, que não
    // tem nenhuma tag og:. Precisa devolver nulo sem lançar.
    const antiBot = "<html><head><title>Um momento</title></head><body></body></html>";
    assert.deepEqual(parseOpenGraph(antiBot), { title: null, description: null, image: null });
    assert.deepEqual(parseOpenGraph(""), { title: null, description: null, image: null });
});

test("sanitizeMlText limpa marcação, entidades e excesso de espaço", () => {
    assert.equal(sanitizeMlText("<script>alert(1)</script>Air Fryer", 100), "Air Fryer");
    assert.equal(sanitizeMlText("<b>Air</b> <i>Fryer</i>", 100), "Air Fryer");
    assert.equal(sanitizeMlText("Preto &amp; branco", 100), "Preto & branco");
    assert.equal(sanitizeMlText("aspas &#39;simples&#39;", 100), "aspas 'simples'");
    assert.equal(sanitizeMlText("muito\n\n  espaço", 100), "muito espaço");
    assert.equal(sanitizeMlText("abcdefghij", 5), "abcde", "corta no limite");
    assert.equal(sanitizeMlText("", 100), "");
});
