# syntax=docker/dockerfile:1.7
#
# Build em dois estágios. A imagem final não carrega o histórico do git nem os
# artefatos intermediários, e roda como usuário sem privilégio.
#
# Sobre o tempo de build (medido nesta VPS, que tem 2 núcleos):
#
#   pnpm install                      693s
#   COPY node_modules entre estágios  277s
#   pnpm build                        ~720s
#
# O estágio `deps` separado foi removido: ele existia para cachear o install,
# mas o `COPY --from=deps node_modules` custava 4,6 min sozinho — o pnpm cria
# dezenas de milhares de symlinks e copiá-los entre estágios é caro. Com o
# install e o build no mesmo estágio, essa cópia deixa de existir e o cache
# do install passa a valer de verdade.
#
# Os `--mount=type=cache` guardam o store do pnpm e o cache de compilação do
# Next entre execuções, então um rebuild sem mudança de dependência não baixa
# nem recompila tudo de novo.

# ---------- 1. Build ----------
FROM node:22.23.2-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Instalado via npm, e não por corepack: o corepack que vem nesta imagem tem as
# chaves de assinatura do registry desatualizadas e falha com
# "Cannot find matching keyid" ao validar o pacote do pnpm.
RUN npm install -g pnpm@11.5.2

# Só os manifestos primeiro: enquanto eles não mudarem, esta camada é reusada
# e o install nem chega a rodar.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store

COPY . .

RUN pnpm prisma generate

# O cache do Next guarda o resultado da compilação por arquivo; sem ele todo
# build recompila o projeto inteiro do zero.
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache,sharing=locked \
    pnpm build

# ---------- 2. Runtime ----------
FROM node:22.23.2-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# O node_modules vem inteiro do builder — inclusive o client já gerado em
# `.prisma/client`. É o que sustenta tanto o `next start` quanto o
# `prisma migrate deploy` do start, e evita depender do tracing do Next para
# descobrir os módulos que o Prisma carrega dinamicamente.
#
# O WORKDIR é /app nos dois estágios de propósito: os shims em
# node_modules/.bin que o pnpm gera guardam caminho absoluto, e mudar o
# diretório os quebraria.
#
# A imagem node já traz o usuário `node` (uid 1000). Rodar como root deixaria
# uma execução de código arbitrário com controle total do container. A posse é
# definida no próprio COPY: um `RUN chown -R` depois criaria uma camada com a
# cópia integral da árvore, dobrando o tamanho da imagem.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/next start"]
