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
 * - `upgrade-insecure-requests`: **só em produção**. Ver a nota abaixo.
 */
const isProduction = process.env.NODE_ENV === "production";

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

  /**
   * Em produção o site é HTTPS atrás do Cloudflare e esta diretiva é desejada:
   * qualquer subrecurso que escape como `http://` é promovido em vez de virar
   * conteúdo misto bloqueado.
   *
   * Em desenvolvimento ela **quebra o acesso pelo IP da máquina** — o caso de
   * abrir o site no celular. O `next dev` serve HTTP puro, mas o navegador
   * reescreve `http://<ip>:3000/_next/...` para `https://`, que não existe, e
   * derruba CSS e JS. A página chega como texto cru e parece bug de código.
   * Passa despercebido no PC, porque `localhost` é tratado como origem segura
   * e fica de fora do upgrade — e no `curl`, que ignora CSP.
   */
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
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

  /**
   * Hosts autorizados a carregar os assets do servidor de desenvolvimento.
   *
   * Vale **só em `next dev`** — não tem efeito nenhum no build de produção.
   * Sem isto, abrir o site pelo IP da máquina (para testar no celular) devolve
   * o HTML normalmente mas responde **403 em todo `/_next/static/*`**, porque o
   * Next confere o header `Origin`. O sintoma engana: a página aparece como
   * texto cru, sem estilo e sem interatividade, como se o código estivesse
   * errado. `curl` não reproduz, porque não manda `Origin`.
   */
  allowedDevOrigins: [
    "192.168.1.42",      // Wi-Fi da máquina
    "100.97.185.114",    // Tailscale
    "desktop-m5n5on9.tail7ef843.ts.net",
  ],

  experimental: {
    // Era 200mb. A galeria aceita no máximo 10 fotos de 5MB, e o limite alto
    // permitia encher storage e memória do servidor num único request.
    serverActions: {
      bodySizeLimit: "10mb",
    },
    proxyClientMaxBodySize: "10mb",
  },

  images: {
    // O otimizador está desligado de propósito, com base em medição:
    //
    //   /api/media    -> 0,1s  (cf-cache-status: HIT)
    //   /_next/image  -> 2,3s  (cf-cache-status: DYNAMIC)
    //
    // O otimizador responde com `vary: Accept`, e o Cloudflare não cacheia
    // esse tipo de resposta. Resultado: cada visitante pagava ~2,3s por
    // imagem, 19 delas numa página de casamento. A rota /api/media, por não
    // variar por header, é cacheada na borda.
    //
    // A compressão foi movida para o momento do upload (src/lib/s3.ts):
    // as fotos já entram no bucket como WebP redimensionado, então não há o
    // que o otimizador acrescente — ele economizava 191KB -> 134KB ao custo
    // de 2,2s.
    //
    // Servir sem otimizar é seguro aqui: o Content-Type de /api/media vem de
    // uma allowlist no servidor, com `nosniff`, e o upload valida o tipo real
    // pelos magic bytes. Não há caminho para um arquivo executável.
    unoptimized: true,

    // `dangerouslyAllowSVG` foi removido: SVG é XML executável, e o upload
    // só aceita JPEG/PNG/WebP de qualquer forma.
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
