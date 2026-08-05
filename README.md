# 💍 Bem Casados App

**Plataforma de lista de casamento** onde convidados podem contribuir com presentes convertidos em saldo financeiro para os noivos. Integração de pagamentos e gerenciamento de convidados + eventos.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação rápida](#instalação-rápida)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados (Docker + Prisma)](#banco-de-dados-docker--prisma)
- [Scripts úteis](#scripts-úteis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## 🚀 Funcionalidades

- Lista de presentes / itens por evento
- Checkout com cálculo de taxas (markup) para repassar custos ao pagador
- Integração com gateway Asaas (PIX, Boleto, Cartão)
- Gestão de convidados e mensagens
- Painel básico para noivos (criação/edição de evento e itens)

## 🛠 Tecnologias

- Next.js (App Router) — versão utilizada: 16.1.1
- React 19
- TypeScript
- Tailwind CSS + ShadcnUI
- Prisma (ORM) — v7
- PostgreSQL (container Docker)
- Gerenciador de pacotes: pnpm

> Consulte `package.json` para versões completas de dependências.

## ⚙️ Pré-requisitos

- Node.js v18+ (ou conforme compatibilidade do projeto)
- pnpm
- Docker & Docker Compose

## Instalação rápida

1. Clone o repositório

```bash
git clone <URL-DO-REPO>
cd bem-casados-app
```

2. Instale dependências

```bash
pnpm install
```

3. Crie um arquivo `.env` (veja exemplo abaixo em **Variáveis de ambiente**)

4. Sobe o banco de dados (Docker)

```bash
docker compose up -d
```

5. Rode migrations e seed

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

6. Inicie o projeto

```bash
pnpm dev
```

O app ficará disponível em: `http://localhost:3000`

---

## Variáveis de ambiente

Copie o template e preencha:

```bash
cp .env.example .env
```

O `.env.example` lista todas as variáveis com uma nota sobre para que servem. As
que não podem faltar em produção:

| Variável | Por quê |
|---|---|
| `DATABASE_URL` | Conexão com o Postgres. |
| `AUTH_SECRET` | Assina os cookies de sessão. Gere com `openssl rand -base64 48`. |
| `AUTH_URL` | URL pública. Sem ela, atrás de proxy o login redireciona para `localhost`. |
| `ASAAS_API_KEY` / `ASAAS_URL` | Gateway de pagamento. Use a URL de sandbox fora de produção. |
| `ASAAS_WEBHOOK_TOKEN` | Autentica o webhook. Sem ela o endpoint recusa tudo. |
| `S3_*` | Bucket de imagens. **Precisa ser privado** — as imagens são servidas por `/api/media/<chave>`. |
| `REDIS_URL` | Rate limiting de checkout e login. Sem ela a aplicação sobe, mas sem freio. |

Nunca versione o `.env`. Para sandbox do Asaas use `https://api-sandbox.asaas.com/v3`.

---

## Banco de dados (Docker + Prisma)

O projeto inclui `docker-compose.yml` para subir um container PostgreSQL mapeado na porta `5433` (host).

- Iniciar DB: `docker compose up -d`
- Aplicar migrations: `npx prisma migrate dev`
- Popular dados: `npx prisma db seed`
- Abrir Prisma Studio: `npx prisma studio`

---

## Scripts úteis

- `pnpm dev` — Inicia o servidor em modo desenvolvimento
- `pnpm build` — Gera build de produção
- `pnpm start` — Inicia o servidor a partir do build
- `pnpm lint` — Roda ESLint

(Os comandos Prisma são executados via `npx prisma ...`)

---

## Estrutura do projeto

- `src/app` — rotas e páginas (Next.js App Router)
- `src/components` — componentes UI (Shadcn)
- `src/lib` — clientes e helpers (ex.: `prisma.ts`)
- `prisma` — schema, seeds e migrations
- `docker-compose.yml` — configuração do PostgreSQL

---

## Contribuindo

Contribuições são bem-vindas: abra issues ou PRs com mudanças pequenas e descrições claras.

- Crie uma branch com o nome `feature/<descrição>`
- Abra PR direcionado para `main`

---

## Licença

Este projeto está sob a licença MIT — verifique o arquivo `LICENSE` (se houver).

---

Desenvolvido com ❤️ para o casamento.
