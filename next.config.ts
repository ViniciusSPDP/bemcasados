import type { NextConfig } from "next";

/**
 * CSP da aplicação.
 *
 * - `style-src 'unsafe-inline'`: framer-motion escreve estilos inline nos
 *   elementos animados; sem isso a página pública perde as animações.
 * - `script-src 'unsafe-inline'`: o runtime do Next injeta os dados de
 *   hidratação inline. Trocar por nonce exige gerar o valor no proxy.ts e
 *   propagar em toda resposta — vale fazer depois, num passo separado.
 * - `frame-src` do YouTube: o player de música de fundo dos stories.
 * - `frame-ancestors 'none'`: ninguém coloca este site em iframe (clickjacking
 *   no /admin e no checkout).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://placehold.co https://i.ytimg.com",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // `output: "standalone"` foi removido de propósito.
  //
  // O Prisma 7 quebrou o runtime do client em pacotes carregados dinamicamente
  // (`@prisma/client-runtime-utils` e companhia). O tracer do standalone não
  // enxerga esses require dinâmicos, então a imagem subia sem eles e toda rota
  // que tocasse o banco morria com "Cannot find module". A imagem fica maior,
  // mas leva o node_modules inteiro e não depende de heurística de tracing.

  // Não anunciar framework e versão no header.
  poweredByHeader: false,

  experimental: {
    // Era 200mb. A galeria aceita no máximo 10 fotos de 5MB, e o limite alto
    // permitia encher storage e memória do servidor num único request.
    serverActions: {
      bodySizeLimit: "10mb",
    },
    proxyClientMaxBodySize: "10mb",
  },

  images: {
    // `dangerouslyAllowSVG` foi removido: SVG é XML executável, e o upload
    // agora só aceita JPEG/PNG/WebP de qualquer forma.
    //
    // O host do MinIO saiu daqui porque o bucket deixou de ser público — as
    // imagens passam por /api/media/<chave>, que é caminho relativo.
    remotePatterns: [
      // Placeholders exibidos enquanto o casal não subiu fotos.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
