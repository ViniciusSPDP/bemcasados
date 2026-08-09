/**
 * Lógica pura por trás da vitrine do Mercado Livre.
 *
 * Resolver um link colado pelo casal significa **o servidor buscar uma URL que
 * o usuário forneceu** — a primeira superfície de SSRF do projeto. O servidor
 * enxerga a rede interna da VPS: o painel do EasyPanel em `localhost:3000`, o
 * Postgres, o MinIO e o endereço de metadados de nuvem `169.254.169.254`.
 *
 * Toda a decisão de segurança mora aqui, sem I/O, para poder ser coberta por
 * teste: `src/services/mercadolivre.ts` só faz a rede em cima destas funções.
 */

/** Hosts de onde aceitamos resolver um link de produto. */
export const ML_LINK_HOSTS: readonly string[] = [
    "meli.la",
    "mercadolivre.com.br",
    "mercadolibre.com",
    "mercadolivre.com",
];

/** Hosts de onde aceitamos baixar a imagem do produto. */
export const ML_IMAGE_HOSTS: readonly string[] = ["mlstatic.com"];

/**
 * Compara host contra a allowlist.
 *
 * A forma da comparação é o ponto: `endsWith(host)` cru deixaria passar
 * `notmeli.la`, e `includes` deixaria passar `meli.la.evil.com`. Só serve
 * igualdade exata ou subdomínio de verdade (`.` + domínio).
 */
function matchesHost(hostname: string, allowed: readonly string[]): boolean {
    if (!hostname) return false;

    // O DNS trata "meli.la." (com ponto final) como o mesmo nome; a comparação
    // de string, não.
    const host = hostname.toLowerCase().replace(/\.$/, "");
    if (!host) return false;

    return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isAllowedLinkHost(hostname: string): boolean {
    return matchesHost(hostname, ML_LINK_HOSTS);
}

export function isAllowedImageHost(hostname: string): boolean {
    return matchesHost(hostname, ML_IMAGE_HOSTS);
}

/** Faixas IPv4 que nunca podem ser alvo de uma requisição nossa. */
const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [string, number]> = [
    ["0.0.0.0", 8],        // "este host"
    ["10.0.0.0", 8],       // privado
    ["100.64.0.0", 10],    // CGNAT
    ["127.0.0.0", 8],      // loopback
    ["169.254.0.0", 16],   // link-local — inclui o 169.254.169.254 das nuvens
    ["172.16.0.0", 12],    // privado
    ["192.0.0.0", 24],     // IETF protocol assignments
    ["192.0.2.0", 24],     // documentação
    ["192.168.0.0", 16],   // privado
    ["198.18.0.0", 15],    // benchmark
    ["198.51.100.0", 24],  // documentação
    ["203.0.113.0", 24],   // documentação
    ["224.0.0.0", 4],      // multicast
    ["240.0.0.0", 4],      // reservado (inclui 255.255.255.255)
];

function ipv4ToBytes(ip: string): Uint8Array | null {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;

    const bytes = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
        const part = parts[i];
        // Só decimal sem zero à esquerda: "0177.0.0.1" é 127.0.0.1 em octal para
        // muitas bibliotecas, e aceitar essa forma abriria uma via de evasão.
        if (!/^\d{1,3}$/.test(part)) return null;
        if (part.length > 1 && part[0] === "0") return null;

        const value = Number(part);
        if (value > 255) return null;
        bytes[i] = value;
    }
    return bytes;
}

function isBlockedIpv4Bytes(bytes: Uint8Array): boolean {
    const value = ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];

    return BLOCKED_IPV4_RANGES.some(([range, prefix]) => {
        const rangeBytes = ipv4ToBytes(range);
        if (!rangeBytes) return false;

        const rangeValue =
            ((rangeBytes[0] << 24) >>> 0) + (rangeBytes[1] << 16) + (rangeBytes[2] << 8) + rangeBytes[3];
        const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;

        return (value & mask) >>> 0 === (rangeValue & mask) >>> 0;
    });
}

/**
 * Expande um IPv6 para 16 bytes, aceitando `::` e o sufixo em forma de IPv4
 * (`::ffff:127.0.0.1`). Devolve `null` no que não conseguir interpretar.
 */
function ipv6ToBytes(ip: string): Uint8Array | null {
    // O zone id (`fe80::1%eth0`) identifica a interface, não o endereço.
    let address = ip.split("%")[0].toLowerCase();
    if (!address) return null;

    const bytes = new Uint8Array(16);
    let tail: Uint8Array | null = null;

    // Sufixo pontuado: os últimos 4 bytes vêm de um IPv4.
    const lastColon = address.lastIndexOf(":");
    const maybeIpv4 = address.slice(lastColon + 1);
    if (maybeIpv4.includes(".")) {
        tail = ipv4ToBytes(maybeIpv4);
        if (!tail) return null;
        address = address.slice(0, lastColon + 1) + "0:0";
    }

    const halves = address.split("::");
    if (halves.length > 2) return null;

    const parseGroups = (raw: string): number[] | null => {
        if (raw === "") return [];
        const groups: number[] = [];
        for (const group of raw.split(":")) {
            if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
            groups.push(Number.parseInt(group, 16));
        }
        return groups;
    };

    const head = parseGroups(halves[0]);
    if (!head) return null;

    let groups: number[];
    if (halves.length === 2) {
        const rest = parseGroups(halves[1]);
        if (!rest) return null;
        const missing = 8 - head.length - rest.length;
        if (missing < 0) return null;
        groups = [...head, ...new Array<number>(missing).fill(0), ...rest];
    } else {
        groups = head;
    }

    if (groups.length !== 8) return null;

    for (let i = 0; i < 8; i++) {
        bytes[i * 2] = (groups[i] >> 8) & 0xff;
        bytes[i * 2 + 1] = groups[i] & 0xff;
    }

    if (tail) bytes.set(tail, 12);

    return bytes;
}

function startsWithPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
    return prefix.every((byte, index) => bytes[index] === byte);
}

/**
 * Decide se um endereço já resolvido pode ser alvo de uma requisição nossa.
 *
 * **Fail-closed**: o que não conseguimos interpretar é tratado como bloqueado.
 * O único alimentador é a saída canônica do `dns.lookup`, então formas exóticas
 * não deveriam chegar aqui — mas se chegarem, caem no lado seguro.
 */
export function isBlockedIp(ip: string): boolean {
    if (!ip) return true;

    const address = ip.trim();
    if (!address) return true;

    if (address.includes(":")) {
        const bytes = ipv6ToBytes(address);
        if (!bytes) return true;

        // As formas que embutem um IPv4 precisam cair na regra do IPv4, senão
        // `::ffff:7f00:1` (que é 127.0.0.1) passaria despercebido.
        const isIpv4Mapped = startsWithPrefix(bytes, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff]);
        const isIpv4Compatible =
            startsWithPrefix(bytes, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) &&
            !(bytes[12] === 0 && bytes[13] === 0 && bytes[14] === 0 && bytes[15] <= 1);
        const isNat64 = startsWithPrefix(bytes, [0x00, 0x64, 0xff, 0x9b]);

        if (isIpv4Mapped || isIpv4Compatible || isNat64) {
            return isBlockedIpv4Bytes(bytes.slice(12));
        }

        // 6to4: os bytes 2..5 carregam o IPv4 do relay.
        if (startsWithPrefix(bytes, [0x20, 0x02])) {
            return isBlockedIpv4Bytes(bytes.slice(2, 6));
        }

        // `::` (não especificado) e `::1` (loopback).
        if (bytes.every((byte, index) => (index < 15 ? byte === 0 : byte <= 1))) return true;

        if ((bytes[0] & 0xfe) === 0xfc) return true;                     // ULA fc00::/7
        if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // link-local fe80::/10
        if (bytes[0] === 0xff) return true;                              // multicast ff00::/8

        return false;
    }

    const bytes = ipv4ToBytes(address);
    if (!bytes) return true;

    return isBlockedIpv4Bytes(bytes);
}

/**
 * Extrai o identificador do anúncio (`MLB123456789`) de uma URL.
 *
 * `MLBU…` é ignorado de propósito: é o id de *página de catálogo* (`/up/`), não
 * de item, e usá-lo para deduplicar juntaria produtos diferentes.
 */
export function extractMlbId(url: string): string | null {
    // O `-?` cobre as duas formas que o ML usa: `/MLB-1234567890-nome/` nas
    // páginas de anúncio e `/p/MLB1234567890` nas de catálogo. `MLBU…` não casa
    // porque o `U` não é dígito nem hífen — que é exatamente o que se quer.
    const match = url.match(/MLB-?(\d{6,})/i);
    return match ? `MLB${match[1]}` : null;
}

export interface OpenGraphData {
    title: string | null;
    description: string | null;
    image: string | null;
}

const HTML_ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
};

function decodeEntities(value: string): string {
    return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
        if (entity[0] === "#") {
            const code =
                entity[1] === "x" || entity[1] === "X"
                    ? Number.parseInt(entity.slice(2), 16)
                    : Number.parseInt(entity.slice(1), 10);
            return Number.isFinite(code) && code > 0 && code <= 0x10ffff
                ? String.fromCodePoint(code)
                : match;
        }
        return HTML_ENTITIES[entity.toLowerCase()] ?? match;
    });
}

/**
 * Lê as meta tags OpenGraph de um HTML.
 *
 * Aceita `property=` e `name=`, aspas simples ou duplas, e os atributos em
 * qualquer ordem — cada CDN monta a tag de um jeito. Nunca lança: HTML sem
 * nenhuma tag `og:` (o caso do anti-bot do ML) devolve tudo nulo.
 */
export function parseOpenGraph(html: string): OpenGraphData {
    const read = (property: string): string | null => {
        const attribute = `(?:property|name)\\s*=\\s*["']og:${property}["']`;
        const content = `content\\s*=\\s*["']([^"']*)["']`;

        const match =
            html.match(new RegExp(`<meta[^>]*${attribute}[^>]*${content}`, "i")) ??
            html.match(new RegExp(`<meta[^>]*${content}[^>]*${attribute}`, "i"));

        const value = match?.[1]?.trim();
        return value ? decodeEntities(value) : null;
    };

    return { title: read("title"), description: read("description"), image: read("image") };
}

/**
 * Prepara texto vindo do Mercado Livre para ser exibido.
 *
 * O conteúdo é renderizado como texto pelo JSX (nunca `dangerouslySetInnerHTML`),
 * então isto não é a defesa contra XSS — é higiene: o que vem do anúncio traz
 * marcação, entidades e espaço em excesso que ficariam visíveis no card.
 */
export function sanitizeMlText(raw: string, maxLength: number): string {
    const withoutScripts = raw.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
    const withoutTags = withoutScripts.replace(/<[^>]*>/g, " ");
    const decoded = decodeEntities(withoutTags);
    const collapsed = decoded.replace(/\s+/g, " ").trim();

    return collapsed.length > maxLength ? collapsed.slice(0, maxLength).trim() : collapsed;
}
