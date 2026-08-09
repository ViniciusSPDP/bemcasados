# BemCasados

Plataforma de lista de casamento. O casal monta uma página pública com sua lista
de presentes; os convidados escolhem um item e **pagam em dinheiro** — não há
produto físico, entrega ou estoque. O valor vai para o casal via gateway.

**Produção:** https://bemcasadosapp.com.br
**Gateway:** Asaas em **produção real** (`https://api.asaas.com/v3`) — toda cobrança criada é dinheiro de verdade. Para testar use `https://api-sandbox.asaas.com/v3`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Prisma 7 +
PostgreSQL (driver adapter `@prisma/adapter-pg`) · NextAuth v5 beta · Tailwind 4 +
shadcn/ui · MinIO (S3) · Redis (rate limit) · pnpm 11 · Docker.

## Regras de negócio

### Modelo de dados

Um `User` (o casal) tem **um** `Event` (o casamento). O `Event` tem `Gift[]`
(lista de presentes) e `GalleryItem[]` (fotos, exibidas como stories). Cada
compra gera uma `Transaction`.

O `Event.slug` é o endereço público (`/{slug}`), único e escolhido no cadastro.
Slugs reservados estão em `src/lib/definitions.ts` — sem essa lista um usuário
registraria `admin` e colidiria com a rota do painel.

### Taxas — o convidado paga, o casal recebe cheio

`src/lib/fees.ts` é a regra central: o valor que o casal cadastrou é o que ele
recebe, e as taxas do gateway são **acrescidas** ao convidado.

```
total = (valor_do_presente + taxa_fixa) / (1 - taxa_percentual)
```

| Método | Percentual | Fixo |
|---|---|---|
| PIX | 0% | R$ 1,99 |
| Boleto | 0% | R$ 0,99 **por parcela** |
| Cartão 1x | 1,99% | R$ 0,49 |
| Cartão 2–6x | 2,49% | R$ 0,49 |
| Cartão 7–12x | 2,99% | R$ 0,49 |

Parcelamento: PIX só à vista, boleto até 6x, cartão até 12x. O limite é validado
no servidor em `src/app/api/checkout/route.ts` — o cliente não é confiável.

### Ciclo de vida de um presente

1. Convidado escolhe → `POST /api/checkout` valida, cria cobrança no Asaas e
   grava `Transaction` com `status: PENDING`. O presente **continua disponível**.
2. Asaas confirma → `POST /api/webhook/asaas` marca `PAID` e só então
   `Gift.available = false`.

**Por que o presente não é bloqueado no checkout:** PIX e boleto podem nunca ser
pagos. Bloquear na intenção deixaria a lista inteira travada por quem desistiu.
A consequência aceita é que dois convidados podem pagar o mesmo presente em
janela curta — para uma lista de casamento, contribuição a mais não é problema.

O checkout **recusa** presente já pago (`available === false`).

### Preço vem do banco, nunca do cliente

`/api/checkout` recebe apenas o `giftId` e lê o preço do banco. O cliente
escolhe forma de pagamento e parcelas — as duas só aumentam o que ele paga.

## Segurança — decisões que não devem ser revertidas

Auditoria completa em agosto/2026. O que está assim de propósito:

- **CPF do convidado não é armazenado.** Vai para o Asaas (que exige) e no banco
  fica só `Transaction.guestCPFMasked` (`•••.•••.890-••`). Base legal LGPD:
  execução de contrato, art. 7º V — **não** consentimento, então não use
  checkbox de aceite para isso.
- **Bucket MinIO é privado.** As imagens passam por `/api/media/<chave>`, que
  valida o formato da chave e exige que ela esteja referenciada no banco. Nunca
  reabrir o bucket nem gravar URL absoluta no `imageUrl` — o banco guarda só a
  **chave**.
- **Upload valida por magic bytes**, não pelo `file.type` do cliente. Só
  JPEG/PNG/WebP. SVG é recusado de propósito: é XML executável.
- **`@prisma/client-runtime-utils` é dependência direta e pinada.** O client é
  gerado em `node_modules/.prisma/client`, fora do grafo do pnpm, e sem essa
  declaração toda consulta morre em runtime. Os pacotes do Prisma sobem juntos —
  mantenha as versões exatas.
- **Rate limiting falha aberto** quando o Redis cai (`src/lib/rate-limit.ts`).
  Deliberado: Redis fora do ar não pode derrubar o checkout.
- **Erros de validação em Server Actions são retornados, não lançados.** O Next
  substitui mensagens de exceção por um digest genérico em produção.
- **`images.unoptimized: true`.** O otimizador do Next responde com
  `vary: Accept` e o Cloudflare não cacheia isso — media 2,3s por imagem contra
  0,06s pela `/api/media`. A compressão foi movida para o upload (`sharp`,
  WebP, máx. 1920px), que de quebra remove o EXIF/geolocalização.

## Comandos

```bash
pnpm dev          # desenvolvimento
pnpm build        # build de produção
pnpm lint
pnpm test         # node:test — lógica pura (CPF, chaves de mídia)
pnpm prisma generate
pnpm prisma migrate dev
```

Antes de qualquer commit: `pnpm lint && pnpm test && pnpm build`.

## Infra

VPS `92.113.39.84` (root via SSH, chave já no PC) com **EasyPanel + Docker Swarm
+ Traefik**, Cloudflare na frente. **Só 2 núcleos** — um build do Next satura a
máquina e leva ~12 min.

- App: serviço `app_app-bem-casados` · Banco: `dados_bem_casados_db` (database
  `dados`, user `postgres`) · Storage: `dados_minio` · Redis:
  `dados_redis-bemcasados`
- Auto-deploy dispara no push para `main`.
- `prisma migrate deploy` roda no start do container (`CMD` do Dockerfile). Se a
  migration falhar, o `&&` impede o start e o site fica fora.
- Logs de build do EasyPanel em `/etc/easypanel/actions/*.log`.

**Cuidado:** o EasyPanel passa todas as env vars como `--build-arg` e grava a
linha de comando completa nesses logs, em texto plano e world-readable.

## Armadilhas conhecidas

- **Não use `output: "standalone"`.** O tracer não enxerga os requires dinâmicos
  do Prisma 7 e a imagem sobe sem eles — toda rota que toca o banco dá 500.
- **`corepack` falha nesta imagem base** (chaves de assinatura vencidas). Use
  `npm install -g pnpm@<versão>`.
- **Node ≥ 22.13** é exigido pelo pnpm 11.
- **`RUN chown -R` num `node_modules` dobra a imagem.** Use `COPY --chown`.
- **Redirect com `localhost:80`** no login significa `AUTH_URL` ausente.
- Objetos antigos do bucket usam chave `<timestamp>-<nome>.jpg`; os novos são
  `<uuid>.webp`. `MEDIA_KEY_PATTERN` aceita os dois — não restrinja a UUID.

## Mapa do código

| Caminho | Papel |
|---|---|
| `src/app/(public)/[slug]/` | Página pública do casamento |
| `src/app/(private)/admin/` | Painel do casal |
| `src/app/api/checkout/` | Cria cobrança no Asaas |
| `src/app/api/webhook/asaas/` | Confirma pagamento |
| `src/app/api/media/[key]/` | Serve imagens do bucket privado |
| `src/actions/` | Server Actions (auth, evento, presentes) |
| `src/lib/dal.ts` | `verifySession()` — toda rota privada começa por aqui |
| `src/lib/fees.ts` | Cálculo de taxas |
| `src/lib/definitions.ts` | Schemas zod centralizados |
| `src/lib/media.ts` | Resolução/validação de chave de mídia (puro) |
| `src/lib/s3.ts` | Upload com validação e compressão (server-only) |
| `src/lib/rate-limit.ts` | Rate limiting sobre Redis |
| `src/lib/documents.ts` | Validação e máscara de CPF/CNPJ |

## Convenções

- Comentários e mensagens de commit em **português**.
- Comentários explicam **por quê**, não o quê — especialmente onde a escolha
  parece estranha sem contexto.
- Server Actions e rotas privadas sempre começam com `verifySession()`.
- Validação de entrada com zod, schemas em `src/lib/definitions.ts`.
- Nunca logar objeto de erro inteiro em caminho que carrega dado de convidado —
  ele leva os parâmetros da query junto.
