import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObjectBody } from "@/lib/s3";
import { mimeForKey, isSafeMediaKey } from "@/lib/media";

/**
 * Serve as imagens do bucket privado.
 *
 * O bucket não aceita mais acesso anônimo, então tudo passa por aqui. Duas
 * travas impedem que isto vire um proxy aberto para o storage:
 *
 *  1. a chave tem de casar com o formato que nós geramos (`<uuid>.<ext>`),
 *     o que já elimina path traversal e prefixos arbitrários;
 *  2. a chave tem de estar referenciada por algum registro do banco — só
 *     imagem que pertence a um presente, a uma galeria ou à vitrine é servida.
 */

/**
 * 404 que a borda **não** pode guardar.
 *
 * Sem o `no-store`, o Cloudflare cacheia a resposta negativa por 4 horas (é o
 * padrão dele; a rota nunca mandou `Cache-Control` no caminho de erro). O 404
 * aqui é quase sempre TEMPORÁRIO: a chave passa a existir assim que a linha do
 * banco é gravada. Uma foto pedida um instante antes do commit da Server Action
 * — ou uma chave reapontada depois — ficava quebrada por 4 horas para todo mundo
 * que passasse pelo mesmo nó da borda, sem nada que o casal pudesse fazer.
 * Aconteceu em produção com a imagem do convite em 9/8/2026.
 *
 * O 200 continua `immutable`: ali a chave é um uuid novo a cada upload e o
 * conteúdo nunca muda.
 */
function notFound() {
    return new NextResponse(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
    });
}
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key: rawKey } = await params;

    // `decodeURIComponent` lança URIError em entrada malformada ("%"), o que
    // viraria 500 num endpoint público.
    let key: string;
    try {
        key = decodeURIComponent(rawKey);
    } catch {
        return notFound();
    }

    if (!isSafeMediaKey(key)) {
        return notFound();
    }

    // Todo campo novo que guarde chave de imagem precisa entrar aqui, senão a
    // imagem existe no bucket mas a rota responde 404.
    const [galleryItem, gift, externalGift, invite] = await Promise.all([
        prisma.galleryItem.findFirst({ where: { imageUrl: key }, select: { id: true } }),
        prisma.gift.findFirst({ where: { imageUrl: key }, select: { id: true } }),
        prisma.externalGift.findFirst({ where: { imageUrl: key }, select: { id: true } }),
        prisma.event.findFirst({ where: { inviteImageUrl: key }, select: { id: true } }),
    ]);

    if (!galleryItem && !gift && !externalGift && !invite) {
        return notFound();
    }

    const contentType = mimeForKey(key);
    if (!contentType) {
        return notFound();
    }

    try {
        const body = await getObjectBody(key);
        if (!body) return notFound();

        return new NextResponse(body.transformToWebStream(), {
            headers: {
                "Content-Type": contentType,
                "X-Content-Type-Options": "nosniff",
                "Content-Disposition": "inline",
                // A chave é imutável (todo upload gera um uuid novo), então dá
                // para cachear agressivamente na borda.
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch {
        return notFound();
    }
}
