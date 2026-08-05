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
 *     imagem que pertence a um presente ou a uma galeria é servida.
 */
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
        return new NextResponse(null, { status: 404 });
    }

    if (!isSafeMediaKey(key)) {
        return new NextResponse(null, { status: 404 });
    }

    const [galleryItem, gift] = await Promise.all([
        prisma.galleryItem.findFirst({ where: { imageUrl: key }, select: { id: true } }),
        prisma.gift.findFirst({ where: { imageUrl: key }, select: { id: true } }),
    ]);

    if (!galleryItem && !gift) {
        return new NextResponse(null, { status: 404 });
    }

    const contentType = mimeForKey(key);
    if (!contentType) {
        return new NextResponse(null, { status: 404 });
    }

    try {
        const body = await getObjectBody(key);
        if (!body) return new NextResponse(null, { status: 404 });

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
        return new NextResponse(null, { status: 404 });
    }
}
