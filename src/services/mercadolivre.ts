// src/services/mercadolivre.ts
import "server-only";
import { lookup } from "node:dns/promises";
import {
    isAllowedLinkHost,
    isAllowedImageHost,
    isBlockedIp,
    extractMlbId,
    parseOpenGraph,
    sanitizeMlText,
} from "@/lib/ml-link";

/**
 * Acesso ao Mercado Livre. Esta é a única parte do projeto que faz requisição
 * para um endereço fornecido pelo usuário — toda a decisão de segurança está em
 * `src/lib/ml-link.ts`, que é puro e coberto por teste.
 *
 * Estado medido em 2026-08-09 (refazer o teste antes de mudar a abordagem):
 *
 *  - **Link curto `meli.la` funciona**: responde 301 e a página de destino
 *    (`/social/<id>`, a vitrine de afiliado) traz `og:title`, `og:image` e
 *    `og:description`. É o caminho que o casal usa, e o enriquecimento acerta.
 *  - **Página de produto direta NÃO funciona**: `produto.mercadolivre.com.br/...`
 *    e `/p/MLB...` redirecionam para `/gz/account-verification` (anti-bot) com
 *    qualquer User-Agent — Chrome, Googlebot, facebookexternalhit, WhatsApp.
 *  - `GET api.mercadolibre.com/items/MLB<id>` devolve 403 `PolicyAgent` sem app
 *    OAuth registrado com as permissões funcionais habilitadas.
 *  - Sem User-Agent de navegador até o encurtador responde 403.
 *
 * Ou seja: o enriquecimento é útil, mas **não confiável** — depende do formato
 * do link e o ML aperta o cerco de tempos em tempos. Por isso ele vive numa
 * ação separada do cadastro e falhar nunca impede o casal de salvar à mão.
 */

const MAX_HOPS = 3;
const TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 512 * 1024;
/** Mesmo teto do upload: passar disso seria recusado pelo `uploadFileToS3`. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Sem User-Agent de navegador o encurtador responde 403 (medido). Não é
// disfarce: é o mínimo para o 301 sair.
const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class ExternalFetchError extends Error {}

export interface ResolvedLink {
    /**
     * Endereço final. **Uso interno**: nunca persistir nem exibir. O botão do
     * convidado usa sempre o link curto original, que é quem carrega a comissão.
     */
    finalUrl: string;
    /** Primeiro `MLB<id>` visto em qualquer salto, não só no destino final. */
    externalId: string | null;
    hops: number;
    html: string | null;
}

export interface ProductDraft {
    title: string | null;
    description: string | null;
    imageSourceUrl: string | null;
    externalId: string | null;
}

/**
 * Confere para onde o host aponta de verdade.
 *
 * Estar na allowlist não diz nada sobre o endereço resolvido: um DNS envenenado,
 * um CNAME interno ou um registro apontando para 169.254.169.254 levariam o
 * servidor a bater na rede da VPS (EasyPanel em :3000, Postgres, MinIO). Basta
 * **um** endereço interno entre os retornados para recusar.
 *
 * Limitação conhecida: entre este `lookup` e o `fetch` existe uma janela de DNS
 * rebinding, porque o `fetch` resolve o nome de novo. Fechá-la exigiria conectar
 * no IP já validado com um agente próprio (`undici.Agent` com `connect.lookup`),
 * trazendo o `undici` como dependência direta. A allowlist de host é o controle
 * primário e só domínios do ML passam; esta checagem é defesa em profundidade.
 */
async function assertPublicHost(hostname: string): Promise<void> {
    let addresses: Array<{ address: string }>;
    try {
        addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new ExternalFetchError("Não foi possível resolver o endereço do link.");
    }

    if (addresses.length === 0) {
        throw new ExternalFetchError("Endereço não resolvido.");
    }

    for (const { address } of addresses) {
        if (isBlockedIp(address)) {
            throw new ExternalFetchError("Endereço não permitido.");
        }
    }
}

/**
 * Lê o corpo com teto de bytes.
 *
 * O `content-length` é declarado pelo servidor remoto e não vale como garantia:
 * o corte de verdade acontece pedaço a pedaço, durante a leitura.
 */
async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (Number.isFinite(declared) && declared > maxBytes) {
        // Descarta o corpo antes de sair, senão o socket fica preso até o GC.
        await res.body?.cancel().catch(() => {});
        throw new ExternalFetchError("Conteúdo grande demais.");
    }

    if (!res.body) return Buffer.alloc(0);

    const reader = res.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            total += value.byteLength;
            if (total > maxBytes) {
                throw new ExternalFetchError("Conteúdo grande demais.");
            }
            chunks.push(Buffer.from(value));
        }
    } finally {
        await reader.cancel().catch(() => {
            /* o corpo já foi consumido ou abortado; não há o que tratar */
        });
    }

    return Buffer.concat(chunks);
}

/**
 * Segue o link curto até o destino, revalidando o host a cada salto.
 *
 * Os redirecionamentos são seguidos **à mão** (`redirect: "manual"`) porque é o
 * único jeito de conferir a allowlist em cada endereço: o `fetch` com redirect
 * automático levaria o servidor a qualquer lugar que o encurtador apontasse.
 */
export async function resolveMercadoLivreLink(rawUrl: string): Promise<ResolvedLink> {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new ExternalFetchError("Link inválido.");
    }

    if (url.protocol !== "https:") {
        throw new ExternalFetchError("Só aceitamos links https.");
    }
    // Antes de qualquer socket.
    if (!isAllowedLinkHost(url.hostname)) {
        throw new ExternalFetchError("Endereço fora do Mercado Livre.");
    }

    let externalId = extractMlbId(url.href);
    let hops = 0;
    let res: Response;

    for (;;) {
        await assertPublicHost(url.hostname);

        try {
            res = await fetch(url, {
                // GET e não HEAD: vários CDNs respondem HEAD de forma diferente,
                // e o GET já traz o HTML na mesma volta.
                method: "GET",
                redirect: "manual",
                signal: AbortSignal.timeout(TIMEOUT_MS),
                cache: "no-store",
                headers: {
                    "user-agent": BROWSER_UA,
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "accept-language": "pt-BR,pt;q=0.9",
                },
            });
        } catch {
            throw new ExternalFetchError("Não foi possível acessar o link.");
        }

        const location = res.headers.get("location");
        if (!REDIRECT_STATUSES.has(res.status) || !location) break;

        if (hops >= MAX_HOPS) {
            await res.body?.cancel().catch(() => {});
            throw new ExternalFetchError("Redirecionamentos demais.");
        }

        let next: URL;
        try {
            // O `Location` pode vir relativo.
            next = new URL(location, url);
        } catch {
            await res.body?.cancel().catch(() => {});
            throw new ExternalFetchError("Redirecionamento inválido.");
        }

        if (next.protocol !== "https:" || !isAllowedLinkHost(next.hostname)) {
            await res.body?.cancel().catch(() => {});
            throw new ExternalFetchError("Redirecionamento para fora do Mercado Livre.");
        }

        // O id costuma aparecer só no salto do meio: o destino final é a página
        // de verificação anti-bot, que já perdeu essa informação.
        externalId = externalId ?? extractMlbId(next.href);

        // Sem isto o socket fica pendurado até o coletor de lixo passar.
        await res.body?.cancel().catch(() => {});

        url = next;
        hops++;
    }

    const contentType = res.headers.get("content-type") ?? "";
    let html: string | null = null;

    if (res.ok && contentType.includes("text/html")) {
        html = (await readCapped(res, MAX_HTML_BYTES)).toString("utf8");
    } else {
        await res.body?.cancel().catch(() => {});
    }

    return { finalUrl: url.href, externalId, hops, html };
}

/**
 * PONTO DE EXTENSÃO — API oficial do Mercado Livre.
 *
 * Hoje `GET https://api.mercadolibre.com/items/MLB<id>` devolve 403
 * (`PolicyAgent` / `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`) sem um app OAuth
 * registrado com as permissões funcionais habilitadas. Quando houver credencial,
 * basta definir `ML_ACCESS_TOKEN`: o resto do fluxo já está pronto e o cadastro
 * manual continua valendo como alternativa.
 */
async function fetchFromOfficialApi(externalId: string | null): Promise<ProductDraft | null> {
    const token = process.env.ML_ACCESS_TOKEN;
    if (!token || !externalId) return null;

    try {
        const res = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(externalId)}`, {
            headers: { authorization: `Bearer ${token}`, accept: "application/json" },
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
        });
        if (!res.ok) return null;

        const item = JSON.parse((await readCapped(res, MAX_HTML_BYTES)).toString("utf8")) as {
            title?: string;
            pictures?: Array<{ secure_url?: string }>;
        };

        const picture = item.pictures?.[0]?.secure_url ?? null;
        const image = picture && isAllowedImageHost(new URL(picture).hostname) ? picture : null;

        return {
            title: item.title ? sanitizeMlText(item.title, 140) : null,
            description: null,
            imageSourceUrl: image,
            externalId,
        };
    } catch {
        return null;
    }
}

/**
 * Tenta descobrir os dados do produto. **Nunca lança**: falhar é o resultado
 * esperado hoje, e o formulário de cadastro não pode depender disto.
 */
export async function fetchProductDraft(shortUrl: string): Promise<ProductDraft> {
    const empty: ProductDraft = {
        title: null,
        description: null,
        imageSourceUrl: null,
        externalId: null,
    };

    try {
        const link = await resolveMercadoLivreLink(shortUrl);

        const official = await fetchFromOfficialApi(link.externalId);
        if (official) return official;

        // Distinguir "caiu no anti-bot" de "página sem og:" economiza uma hora
        // de investigação daqui a seis meses. Acontece com link de página de
        // produto; o link curto `meli.la` costuma passar.
        if (link.finalUrl.includes("/gz/account-verification")) {
            console.warn("[ml] anti-bot: o Mercado Livre pediu verificação em vez da página do produto.");
            return { ...empty, externalId: link.externalId };
        }

        const og = link.html
            ? parseOpenGraph(link.html)
            : { title: null, description: null, image: null };

        let image: string | null = null;
        if (og.image) {
            try {
                image = isAllowedImageHost(new URL(og.image).hostname) ? og.image : null;
            } catch {
                image = null;
            }
        }

        // Na página de afiliado (`/social/<id>`) o `og:title` e o `og:image` são
        // do produto, mas o `og:description` descreve a vitrine do vendedor
        // ("Visite a página e encontre todos os produtos de ms2024…"). Preencher
        // o campo com isso só daria trabalho ao casal, que teria de apagar.
        const isSocialPage = link.finalUrl.includes("/social/");

        return {
            title: og.title ? sanitizeMlText(og.title, 140) : null,
            description:
                og.description && !isSocialPage ? sanitizeMlText(og.description, 1000) : null,
            imageSourceUrl: image,
            externalId: link.externalId,
        };
    } catch (error) {
        // Só a mensagem: o objeto de erro carrega a URL completa, e ela leva os
        // parâmetros de afiliado do casal junto.
        console.warn(
            "[ml] enriquecimento indisponível:",
            error instanceof Error ? error.message : "erro desconhecido"
        );
        return empty;
    }
}

/**
 * Baixa a foto do produto do CDN do Mercado Livre.
 *
 * Diferente do resolvedor, aqui **nenhum** redirecionamento é aceito: o CDN
 * responde 200 direto, e um redirect seria sinal de que a URL não é o que
 * aparenta. A validação de conteúdo de verdade é o `sniffMime` do
 * `uploadFileToS3`, por magic bytes — o `content-type` daqui é só triagem barata.
 */
export async function downloadImage(imageUrl: string): Promise<Buffer> {
    let url: URL;
    try {
        url = new URL(imageUrl);
    } catch {
        throw new ExternalFetchError("Endereço de imagem inválido.");
    }

    if (url.protocol !== "https:" || !isAllowedImageHost(url.hostname)) {
        throw new ExternalFetchError("A imagem precisa vir do Mercado Livre.");
    }

    await assertPublicHost(url.hostname);

    let res: Response;
    try {
        res = await fetch(url, {
            method: "GET",
            redirect: "manual",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
            headers: { "user-agent": BROWSER_UA, accept: "image/*" },
        });
    } catch {
        throw new ExternalFetchError("Não foi possível baixar a imagem.");
    }

    if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        throw new ExternalFetchError("Não foi possível baixar a imagem.");
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
        await res.body?.cancel().catch(() => {});
        throw new ExternalFetchError("O endereço informado não é uma imagem.");
    }

    return readCapped(res, MAX_IMAGE_BYTES);
}
