import Redis from "ioredis";
import "server-only";

/**
 * Rate limiting em janela fixa sobre Redis.
 *
 * Escolha deliberada: se o Redis estiver fora do ar, a checagem **libera** a
 * requisição em vez de bloquear. Um Redis indisponível derrubaria o checkout
 * inteiro, e presente de casamento não pode parar de ser comprado porque um
 * container caiu. A falha fica registrada no log para ser percebida.
 */

let client: Redis | null = null;
let disabledWarningShown = false;

function getRedis(): Redis | null {
    const url = process.env.REDIS_URL;

    if (!url) {
        if (!disabledWarningShown) {
            disabledWarningShown = true;
            console.warn("[rate-limit] REDIS_URL não configurado — rate limiting desativado.");
        }
        return null;
    }

    if (!client) {
        client = new Redis(url, {
            maxRetriesPerRequest: 1,
            connectTimeout: 1000,
            enableOfflineQueue: false,
            lazyConnect: true,
        });
        client.on("error", (err) => {
            console.error("[rate-limit] Redis indisponível:", err.message);
        });
        client.connect().catch(() => {
            /* o handler de erro acima já registra; seguimos liberando */
        });
    }

    return client;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

export interface RateLimitOptions {
    /** Identificador do balde, ex.: `checkout:1.2.3.4`. */
    key: string;
    /** Requisições permitidas dentro da janela. */
    limit: number;
    /** Tamanho da janela em segundos. */
    windowSeconds: number;
}

export async function checkRateLimit({
    key,
    limit,
    windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
    const redis = getRedis();
    if (!redis) {
        return { success: true, remaining: limit, retryAfterSeconds: 0 };
    }

    const redisKey = `rl:${key}`;

    try {
        const pipeline = redis.pipeline();
        pipeline.incr(redisKey);
        // Só define a expiração quando o contador nasce, para a janela não ficar
        // sendo empurrada a cada nova requisição.
        pipeline.expire(redisKey, windowSeconds, "NX");
        pipeline.ttl(redisKey);

        const results = await pipeline.exec();
        if (!results) {
            return { success: true, remaining: limit, retryAfterSeconds: 0 };
        }

        const count = Number(results[0]?.[1] ?? 0);
        const ttl = Number(results[2]?.[1] ?? windowSeconds);

        return {
            success: count <= limit,
            remaining: Math.max(0, limit - count),
            retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
        };
    } catch (error) {
        console.error("[rate-limit] Falha ao consultar o Redis:", error);
        return { success: true, remaining: limit, retryAfterSeconds: 0 };
    }
}

export class RateLimitError extends Error {
    constructor(message: string, readonly retryAfterSeconds: number) {
        super(message);
        this.name = "RateLimitError";
    }
}

/** Versão para Server Actions: lança quando o limite estoura. */
export async function enforceRateLimit(
    options: RateLimitOptions & { message?: string }
): Promise<void> {
    const result = await checkRateLimit(options);
    if (!result.success) {
        throw new RateLimitError(
            options.message ?? "Muitas tentativas. Tente novamente em instantes.",
            result.retryAfterSeconds
        );
    }
}

/**
 * IP do cliente. Há Cloudflare e Traefik na frente da aplicação, então
 * `CF-Connecting-IP` é a fonte confiável; os demais cabeçalhos são fallback.
 */
export function getClientIp(headers: Headers): string {
    const cf = headers.get("cf-connecting-ip");
    if (cf) return cf.trim();

    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();

    return headers.get("x-real-ip")?.trim() || "unknown";
}
