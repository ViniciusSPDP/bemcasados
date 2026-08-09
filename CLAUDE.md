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

Há uma **segunda modalidade de presente**, independente do Asaas:
`ExternalGift[]` é a vitrine do Mercado Livre — o convidado compra na loja e só
**reserva** aqui. Sem preço, taxa, CPF nem webhook. Ver "Vitrine" abaixo.

O `Event` tem ainda `Rsvp[]`: as confirmações de presença, uma por telefone.
Nada a ver com presente ou dinheiro. Ver "Confirmação de presença" abaixo.

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

**Leia o [`SECURITY.md`](SECURITY.md)** antes de escrever código novo: ele tem as
regras (validação no servidor, autorização por posse, upload, SSRF, LGPD,
logging) e o inventário do que já existe. O resumo abaixo é o que está assim de
propósito:

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
- **A foto é comprimida no navegador antes de subir** (`src/lib/image-compress.ts`,
  canvas → WebP, máx. 1920px). Não é otimização: sem isso uma foto de celular
  passa dos 10 MB do corpo das Server Actions, o Next corta o stream e o erro que
  chega é `Unexpected end of form`, que não menciona tamanho nem arquivo. O
  `sharp` continua reprocessando no servidor — a compressão do cliente é
  conveniência, a do servidor é a garantia. `createImageBitmap` usa
  `imageOrientation: "from-image"`, senão foto tirada em pé chega deitada.
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

### A data do casamento é data pura, não um instante

`Event.eventDate` vem de um `<input type="date">`, é gravada como **meia-noite
UTC** e a coluna é `timestamp without time zone`. Toda tela que mostrar essa data
tem que lê-la em **UTC** — use `src/lib/event-date.ts`
(`formatEventDate` / `eventDateParts`), nunca `toLocaleDateString` cru.

**Isto já saiu errado em produção.** A página pública usava
`new Date(eventDate).toLocaleDateString('pt-BR')` dentro de um bloco que só
renderiza **depois da hidratação** (fica atrás do envelope e dos stories), então
o fuso aplicado era o do celular do convidado. No Brasil, UTC-3, `2026-10-24
00:00 UTC` virava **23 de outubro** — um dia antes, para todo mundo no país. O
container roda em UTC, então o SSR mostrava o dia certo e a hidratação trocava.

O remendo que foi usado enquanto o bug existia: **cadastrar a data com um dia a
mais**. Se aparecer um evento com a data adiantada, é isso — o dado precisa
voltar ao dia real agora que a leitura foi corrigida, senão o erro inverte.

### Convite virtual (`/{slug}/convite`)

Tela nova e separada, no estilo do convite impresso: monograma, versículo, nomes
em caligráfica, data e três ícones de ação. É o link que o casal manda aos
convidados.

- **Paleta azul-marinho (`#0a1628`/`#0d1b34`) e dourado (`#c9a227`)**, aplicada
  ao convite, à vitrine e ao diálogo de reserva — a jornada do convidado. O
  painel, o login e o checkout continuam rose de propósito.
- **Os três ícones**: Localização (link do mapa, host validado), Sugestão de
  presente (leva à vitrine do ML; cai na lista de dinheiro se não houver
  vitrine) e Confirmar presença (abre o diálogo de RSVP, sem sair do convite).
- **Todo campo do convite é opcional.** Vazio some da tela, e um evento criado
  antes desta feature continua válido.
- **O fundo é a primeira foto da galeria**, com sobreposição forte. Reusar a
  galeria evita um campo novo e deixa o casal trocar a imagem pelo painel.
- **`ceremonyMapsUrl` tem allowlist de host** (Google, Waze, OSM, Apple). Não é
  anti-SSRF — nada é buscado pelo servidor —, é para o convite não virar um
  redirecionador saindo de um domínio em que o convidado confia.
- **A hora fica em `ceremonyTime` (`"20:30"`)**, e não no `eventDate`: o cadastro
  grava a data a partir de um `<input type="date">`, então a hora ali é sempre
  00:00. Ver "A data do casamento é data pura" abaixo.
- **Fontes**: `font-script` (Great Vibes) nos nomes, `font-serif` (Playfair) nos
  números e no local. As duas só funcionam porque o `globals.css` foi corrigido —
  ele apontava para `--font-geist-sans`, herdado do template e inexistente, então
  Inter e Playfair estavam carregadas mas **nunca aplicadas**.

### Vitrine do Mercado Livre (`/{slug}/vitrine`)

Tela separada, sem cobrança nossa. O casal cola o link, o convidado compra lá.

- **O `shortUrl` é guardado exatamente como o casal colou.** É ele que carrega o
  código de afiliado — usar o endereço resolvido no botão perderia a comissão.
  Por isso a URL resolvida não é persistida em campo nenhum.
- **A reserva não expira.** O casal libera pelo painel, e liberar **apaga** nome,
  telefone e mensagem — não só o carimbo de data.
- **A corrida é resolvida no banco**: `updateMany` com `where: { reservedAt: null }`
  e checagem do `count`. Dois convidados no mesmo segundo, só um ganha.
- Diferente do `Gift` do Asaas, aqui **bloquear na intenção é o objetivo** — a
  reserva *é* o produto. A válvula de escape é o botão do painel.
- **O enriquecimento depende do formato do link.** Medido em 2026-08-09:
  o link curto `meli.la` **funciona** (resolve para `/social/<id>` e traz
  `og:title` e `og:image` do produto); o endereço direto da página de produto
  **cai no anti-bot** (`/gz/account-verification`) com qualquer User-Agent; e a
  API `api.mercadolibre.com/items/` devolve 403 `PolicyAgent` sem app OAuth.
  Por isso o botão "buscar dados" é best-effort, vive numa action separada do
  cadastro, e falhar nunca impede salvar à mão. Ponto de extensão para OAuth em
  `fetchFromOfficialApi` (`ML_ACCESS_TOKEN`).
- **A `og:description` do link social é descartada**: ela descreve a vitrine do
  vendedor, não o produto. Só `og:title` e `og:image` são aproveitados.
- **A vitrine não tem preço.** Foi implementado e removido a pedido do Vinicius:
  o valor no Mercado Livre varia demais (promoção, vendedor, frete) e um número
  congelado aqui mostraria ao convidado um preço que não é o que ele vai pagar.
  Não reintroduzir sem resolver a atualização do valor.
- **SSRF**: `src/lib/ml-link.ts` tem a allowlist e o filtro de IP, puros e
  testados; `src/services/mercadolivre.ts` faz o I/O em cima deles.
- **Importação por planilha** (`importExternalGifts`): CSV, porque `.xlsx` é
  binário e exigiria dependência de terceiro. `src/lib/csv.ts` é puro e detecta
  `;` (Excel pt-BR) e `,` (Sheets), BOM, CRLF e aspas. **As linhas vazias são
  preservadas no parser** e filtradas depois — descartá-las antes desalinharia a
  numeração do relatório e o casal procuraria o erro na linha errada.
  Processamento **sequencial** e teto de 15 por lote: 15 requisições simultâneas
  ao ML é o caminho curto para tomar bloqueio por robô. Linha que o ML não
  resolve não derruba o lote — vira "não encontrado" no relatório, com o link.

### Confirmação de presença (RSVP)

O terceiro ícone do convite. Escopo fechado em [`docs/PLANO-RSVP.md`](docs/PLANO-RSVP.md).

- **Acesso aberto**, como a reserva da vitrine: quem tem o link confirma, sem
  cadastro. A consequência aceita é que alguém não convidado pode responder —
  para casamento é raro, e o casal vê a lista e apaga.
- **`@@unique([eventId, phone])` é o coração da feature.** O telefone identifica
  a resposta, e `submitRsvp` faz `upsert` sobre essa chave: quem mudou de ideia
  **corrige** em vez de criar uma segunda linha. Sem isso a pessoa tentaria de
  novo e receberia um erro sem saída. O `catch` de P2002 cobre o caso das duas
  abas simultâneas — nesse caso a segunda vira update.
- **Total de pessoas é `1 + companions.length`, calculado na leitura.** Nunca
  gravado: um contador ao lado dos nomes divergiria deles na primeira correção.
- **Os acompanhantes são um `String[]`**, não uma tabela. A lista tem 2–5 nomes,
  nunca é consultada sozinha e sempre é lida junto com quem a preencheu — uma
  tabela filha custaria join em toda leitura do painel sem nada em troca.
- **Quem responde "não vou" é registrado.** Para o casal, "respondeu que não" e
  "não respondeu" são coisas diferentes. Os acompanhantes de uma recusa são
  zerados **no servidor** (`RsvpSchema`), não só escondidos no formulário.
- **Status desconhecido é lido como recusa** (`toAdminRsvp`). Contar como
  presente quem não confirmou faria o casal pagar prato a mais no bufê.
- **O link do convite é um só**, igual para todo mundo — convite individual por
  família foi avaliado e recusado. A consequência: se a tia inclui o tio como
  acompanhante e ele recebe o mesmo link e confirma sozinho, ele conta **duas
  vezes** no número do bufê, porque a chave única é `(evento, telefone)` e são
  dois telefones. Duas defesas, nenhuma automática: o diálogo avisa que quem foi
  incluído como acompanhante não precisa confirmar de novo, e o painel marca a
  linha com `findPossibleDuplicates` (comparação de nome sem acento nem caixa).
  **Não resolvemos sozinhos de propósito** — pode ser homônimo, e apagar a linha
  errada é pior do que o número inflado. Quem decide é o casal.
- **O painel edita e exclui.** Excluir resolve o convidado que ninguém convidou;
  nome digitado errado e acompanhante a mais ou a menos são o caso comum, e o
  casal não tem como pedir ao convidado que refaça. `RsvpSchema` (público) e
  `UpdateRsvpSchema` (painel) compartilham o objeto `RsvpFields`: as duas
  entradas escrevem na mesma tabela, e a que ficasse mais frouxa viraria o
  caminho para gravar o que a outra recusa. Editar o telefone pode esbarrar na
  chave única — `updateRsvp` devolve mensagem em vez de juntar as linhas, porque
  fundir duas confirmações é decisão do casal.
- **A lista nunca vai para página pública.** Nenhum arquivo de
  `src/app/(public)/` consulta `prisma.rsvp` — e há um teste que varre o
  diretório e falha se passar a consultar. O convidado escreve por Server
  Action; ele nunca lê.
- **Sem pré-carregar a resposta anterior no convite.** Buscá-la exigiria um
  endereço anônimo que devolvesse a confirmação a partir de um telefone, o que
  seria um oráculo: qualquer um descobriria quem vai ao casamento e com quem.
- **O CSV exportado neutraliza fórmula** (`escapeCsvFormula`): o nome e o recado
  vêm de um formulário aberto, e o Excel executa célula que começa com `=`. O
  arquivo é montado no navegador, a partir do que a página já carregou atrás do
  `verifySession()` — uma rota de download seria superfície de autenticação nova
  para servir dado que já está na tela.
- **A política de privacidade já descrevia esta coleta** antes da
  implementação, inclusive o nome de terceiros (o acompanhante). Não precisa ser
  tocada — mas os dois precisam ir ao ar juntos.

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
- **O auto-deploy no push para `main` NÃO funciona.** O webhook do GitHub aponta
  para `http://92.113.39.84:3000/api/deploy/<token>`, que é o painel do
  EasyPanel — e a porta 3000 está fechada para a internet (de propósito: painel
  de infra exposto é superfície séria). Toda entrega desde 8/8/2026 falhou com
  `502 failed to connect to host`, silenciosamente, e foi por isso que a vitrine
  ficou dias na `main` sem subir. **Confira o histórico do webhook** antes de
  assumir que um push virou deploy:
  `gh api repos/ViniciusSPDP/bemcasados/hooks/<id>/deliveries`.
  Para disparar agora, chame a mesma URL **de dentro da VPS**, trocando o host
  por `localhost`. Correção de verdade ainda pendente: expor o endpoint por
  Traefik com HTTPS e allowlist dos IPs do GitHub, ou trocar por GitHub Actions
  com deploy via SSH.
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
| `src/app/(public)/[slug]/convite/` | Convite virtual (azul-marinho e dourado) |
| `src/app/(public)/[slug]/vitrine/` | Vitrine do Mercado Livre (afiliado) |
| `src/components/public/rsvp-dialog.tsx` | Confirmação de presença (convidado) |
| `src/app/(private)/admin/` | Painel do casal |
| `src/app/api/checkout/` | Cria cobrança no Asaas |
| `src/app/api/webhook/asaas/` | Confirma pagamento |
| `src/app/api/media/[key]/` | Serve imagens do bucket privado |
| `src/actions/` | Server Actions (auth, evento, presentes) |
| `src/lib/dal.ts` | `verifySession()` — toda rota privada começa por aqui |
| `src/lib/fees.ts` | Cálculo de taxas |
| `src/lib/definitions.ts` | Schemas zod centralizados |
| `src/lib/media.ts` | Resolução/validação de chave de mídia (puro) |
| `src/lib/ml-link.ts` | Allowlist e filtro de IP anti-SSRF (puro) |
| `src/lib/phone.ts` | Telefone brasileiro: dígitos, validação, máscara (puro) |
| `src/lib/external-gift.ts` | Barreira: o que da vitrine pode ir ao cliente (puro) |
| `src/lib/rsvp.ts` | RSVP: contagem de pessoas, barreira e CSV (puro) |
| `src/lib/event-date.ts` | Data do casamento lida em UTC (puro) |
| `src/lib/csv.ts` | CSV nos dois sentidos: importação e exportação (puro) |
| `src/services/mercadolivre.ts` | Resolve link do ML e baixa a imagem |
| `src/lib/s3.ts` | Upload com validação e compressão (server-only) |
| `src/lib/rate-limit.ts` | Rate limiting sobre Redis |
| `src/lib/documents.ts` | Validação e máscara de CPF/CNPJ |

## Convenções

- **Testar local sempre; merge e deploy só com autorização explícita.** Rode
  `pnpm lint && pnpm test && pnpm build` e valide em runtime local antes de
  qualquer coisa. Uma autorização anterior vale para **aquele** deploy, não para
  os próximos — e perguntar sem esperar a resposta não conta. Quando houver
  dependência de ordem entre subir código e alterar dado de produção (o caso
  clássico: a correção de fuso precisa estar no ar antes de a data ser
  corrigida), **explique a dependência e pare** — a decisão de quando produção
  muda é do Vinicius, não sua.
- Comentários e mensagens de commit em **português**.
- Comentários explicam **por quê**, não o quê — especialmente onde a escolha
  parece estranha sem contexto.
- Server Actions e rotas privadas sempre começam com `verifySession()`.
- Validação de entrada com zod, schemas em `src/lib/definitions.ts`.
- Nunca logar objeto de erro inteiro em caminho que carrega dado de convidado —
  ele leva os parâmetros da query junto.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
