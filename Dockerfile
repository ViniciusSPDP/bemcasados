# Build multi-stage: a imagem final não carrega código-fonte, devDependencies
# nem o histórico do git, e roda como usuário sem privilégio.

# ---------- 1. Dependências de build ----------
FROM node:22.12.0-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- 2. Build ----------
FROM node:22.12.0-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN pnpm build

# ---------- 3. CLI de migração ----------
#
# `prisma migrate deploy` roda no start do container, então o CLI precisa
# existir em produção. Ele fica numa árvore própria, instalada com npm (layout
# plano) em vez de reaproveitar o node_modules do pnpm: os shims do pnpm
# apontam para caminhos absolutos dentro de node_modules/.pnpm, que o output
# `standalone` do Next não carrega.
#
# A versão precisa acompanhar a do package.json.
FROM node:22.12.0-alpine AS migrator
WORKDIR /migrate
RUN npm install --no-save --omit=dev prisma@7.9.1 dotenv@17.2.3

# ---------- 4. Runtime ----------
FROM node:22.12.0-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# `output: "standalone"` no next.config.ts monta uma árvore só com o que a
# aplicação realmente importa.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ferramenta de migração, isolada da árvore da aplicação.
COPY --from=migrator /migrate /migrate
COPY --from=builder /app/prisma /migrate/prisma
COPY --from=builder /app/prisma.config.ts /migrate/prisma.config.ts

# A imagem node já traz o usuário `node` (uid 1000). Rodar como root deixaria
# uma execução de código arbitrário com controle total do container.
RUN chown -R node:node /app /migrate
USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "cd /migrate && ./node_modules/.bin/prisma migrate deploy && cd /app && node server.js"]
