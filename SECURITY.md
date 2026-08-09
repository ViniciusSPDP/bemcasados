# Segurança — BemCasados

Este projeto movimenta **dinheiro real** e trata **dado pessoal de convidados**
que nunca criaram conta aqui. Este documento tem duas partes:

1. **Regras** — o que seguir ao escrever código novo, com o porquê de cada uma.
2. **Inventário e pendências** — o que já está implementado e o que ainda não.

> As regras valem sempre. O inventário reflete o código em **9 de agosto de
> 2026** e envelhece: confira o `arquivo:linha` antes de confiar nele.

---

## Parte 1 — Regras

### 1. Validação sempre no servidor. O cliente nunca é fonte de verdade

Tudo que chega do navegador é entrada hostil, inclusive de um usuário logado.
Validação no cliente existe para o formulário dar retorno rápido — ela **não
conta** como controle.

O caso canônico é o preço. `/api/checkout` recebe só o `giftId` e lê o valor do
banco (`src/app/api/checkout/route.ts:66-89`):

```ts
const gift = await prisma.gift.findUnique({ where: { id: data.giftId }, ... });
const giftPrice = Number(gift.price);
```

O corpo da requisição **não tem** campo de valor, e mesmo que tivesse, o
`CheckoutSchema` é um objeto zod sem `passthrough` e o descartaria. O cliente
controla apenas forma de pagamento e parcelas — e as duas só aumentam o que ele
paga.

As validações de cliente e servidor **divergem de propósito**:

| Campo | Cliente (`checkout-modal.tsx`) | Servidor (`api/checkout/route.ts`) |
|---|---|---|
| `guestCPFCNPJ` | `min(11)` — só comprimento | normaliza `\D` + confere **dígito verificador** (`:14-17`) |
| `installments` | `max(12)` para qualquer método | teto **por método**: PIX 1, boleto 6, cartão 12 (`:57-64`) |

**Corolário — toda referência a recurso vinda do cliente é cruzada contra o que
o usuário possui.** Na galeria, as chaves de imagem "mantidas" que o cliente
devolve são conferidas contra as do próprio evento antes de serem aceitas
(`src/actions/event-actions.ts:72-90`). Sem isso, o casal apontaria a galeria
dele para a foto de outro casal.

Schemas ficam em `src/lib/definitions.ts`. Erros são extraídos com
`parsed.error.issues[0]?.message ?? 'Dados inválidos'` — **nunca** devolva o
`issues` inteiro numa resposta: o zod inclui o valor recebido junto do erro, e
esse valor é o CPF ou o telefone do convidado.

**Quando duas entradas escrevem na mesma tabela, elas compartilham o schema.** A
confirmação de presença tem duas: o convidado (`RsvpSchema`) e o casal corrigindo
pelo painel (`UpdateRsvpSchema`). As duas montam o objeto a partir do mesmo
`RsvpFields` e só divergem em como a linha é identificada — `slug` de um lado,
`id` do outro. Copiar os campos deixaria as regras derivarem, e a entrada mais
frouxa viraria o caminho para gravar o que a outra recusa.

### 2. Autorização é posse, não só sessão

`verifySession()` (`src/lib/dal.ts:9-17`) garante **apenas** que existe um JWT
válido. Não diz nada sobre a quem o recurso pertence e não existe RBAC aqui.

Quem chama filtra pelo `userId` — pelo `where` da query, que é a forma preferida:

```ts
const event = await prisma.event.findFirst({
    where: { userId: session.userId },
    select: { id: true },
});
```

…ou pela comparação explícita, quando o recurso é buscado por id
(`src/actions/gift-actions.ts:100`):

```ts
if (!gift || gift.event.userId !== session.userId) throw new Error("Não autorizado.");
```

**Nunca grave um `eventId` que veio do cliente.** Busque-o pela sessão.

Duas coisas que não protegem nada sozinhas:

- **Não existe `(private)/layout.tsx`.** Cada página nova sob `(private)/`
  precisa repetir o `verifySession()` — não há rede estrutural.
- **Rotas de API não passam pelo middleware.** O matcher de `src/proxy.ts:22` é
  estreito de propósito (`/admin/:path*`, `/login`, `/register`) e o middleware é
  conveniência, não controle.

Quando negar acesso, use **a mesma resposta** para "não existe" e "não é seu",
como em `releaseExternalGiftReservation` — senão a mensagem vira um oráculo que
confirma a existência de ids alheios.

### 3. Erro de validação é retornado, não lançado

Em produção o Next substitui a mensagem de uma exceção de Server Action por um
digest genérico. Lançar faria o casal ver "erro inesperado" no lugar de "arquivo
maior que 5MB". O padrão de retorno é `ActionResult`
(`src/actions/gift-actions.ts:12-15`).

`enforceRateLimit` lança por desenho; cada chamador converte em retorno:

```ts
try {
    await enforceRateLimit({ key: `gift:create:${session.userId}`, limit: 30, windowSeconds: 3600 });
} catch (error) {
    if (error instanceof RateLimitError) return { success: false, message: error.message };
    throw error;
}
```

**Exceção conhecida:** `deleteGift` lança (`gift-actions.ts:101`) porque é
chamada via `<form action={deleteGift.bind(null, id)}>`, e o chamador não trata —
o casal vê a tela de erro do Next. Ao escrever ação de exclusão nova, prefira o
padrão do `deleteExternalGift` com tratamento no componente.

### 4. Upload: magic bytes, nunca `file.type`

O `file.type` é escolhido pelo cliente. A validação real olha os primeiros bytes
(`src/lib/s3.ts:30-47`), **antes** de qualquer processamento.

**SVG é recusado de propósito**: é XML executável, e serví-lo do nosso domínio
seria XSS armazenado.

Outras invariantes do caminho de imagem:

- O nome do arquivo vindo do cliente é **descartado por completo**. A chave é
  `randomUUID() + ".webp"` (`s3.ts:102`) — senão o cliente controlaria prefixos,
  sobrescrita e caracteres de path.
- O re-encode para WebP elimina o EXIF, **inclusive a geolocalização** que
  celulares gravam na foto.
- **O banco guarda a chave, nunca a URL absoluta.** A exibição passa por
  `/api/media/<chave>`, que tem dupla trava: o formato da chave (`isSafeMediaKey`)
  **e** a exigência de que ela esteja referenciada no banco.

> **Ao criar uma tabela com campo de imagem**, acrescente o `findFirst` dela ao
> `Promise.all` de `src/app/api/media/[key]/route.ts`. Sem isso a imagem existe
> no bucket mas a rota responde 404 — foi a pegadinha da vitrine.

### 5. Requisição a URL fornecida pelo usuário (SSRF)

O servidor enxerga a rede interna da VPS: painel do EasyPanel em `localhost:3000`,
Postgres, MinIO e o endereço de metadados de nuvem `169.254.169.254`. Fazer o
servidor buscar uma URL que o usuário colou é a superfície mais perigosa do
projeto. Hoje existe uma só: a vitrine (`src/services/mercadolivre.ts`, sobre
`src/lib/ml-link.ts`).

Quem for abrir outra segue estas seis regras:

1. **Allowlist de host antes do primeiro socket.** Validada já no zod
   (`ExternalGiftUrlSchema`), então uma URL fora da lista nunca vira conexão.
2. **Revalidar a cada redirecionamento.** `redirect: "manual"` e seguir os saltos
   à mão, com teto (`MAX_HOPS = 3`). Com redirect automático, um encurtador leva
   o servidor a qualquer lugar.
3. **Comparar host por igualdade ou subdomínio de verdade** —
   `host === d || host.endsWith("." + d)`. `includes` deixaria passar
   `meli.la.evil.com`; `endsWith` cru deixaria passar `notmeli.la`.
4. **Recusar IP interno depois do DNS**, em todos os endereços retornados: as
   faixas privadas, loopback, link-local, CGNAT — **e as formas IPv6 que embutem
   IPv4**, que são o ponto cego clássico (`::ffff:7f00:1` é 127.0.0.1).
   `isBlockedIp` é **fail-closed**: o que não parseia é bloqueado.
5. **Timeout curto e limite de bytes.** O corte é feito pedaço a pedaço na
   leitura — o `content-length` é declarado pelo servidor remoto e não vale como
   garantia.
6. **Rate limit.** Por `userId` quando há sessão.

Também: cancele o corpo (`res.body?.cancel()`) dos redirects, senão o socket fica
pendurado.

**Limitação declarada:** entre o `dns.lookup` e o `fetch` existe uma janela de
DNS rebinding, porque o `fetch` resolve o nome de novo. Fechá-la exigiria conectar
no IP já validado com `undici.Agent`. A allowlist de host é o controle primário; o
check de DNS é defesa em profundidade. Está comentado no código como
endurecimento futuro.

### 6. Segredos e logging

**Nunca logue o objeto de erro inteiro** em caminho que carrega dado de convidado
ou credencial. Um `AxiosError` leva `config.data` (o corpo enviado), `config.url`
(com a query string) e `config.headers` (com o token). Logue `error.message`, ou
um identificador interno (`gift.id`, `transaction.id`).

Isto não é hipotético: `src/services/asaas.ts:54` fazia
`console.error("...", error)` no caminho do checkout, o que colocava **o CPF
completo do convidado e a `ASAAS_API_KEY` de produção** no log do container.
Corrigido em 9 de agosto de 2026.

Correlato: o Prisma roda com `log: ["error","warn"]` e **sem `"query"`**
(`src/lib/prisma.ts:15-18`) — `"query"` imprimiria e-mail, CPF e hash de senha no
stdout.

Sobre variáveis de ambiente: tudo que começa com `NEXT_PUBLIC_` **vai para o
bundle do cliente**. Hoje só existe uma, `NEXT_PUBLIC_SITE_URL`. Nunca prefixe
uma credencial com isso.

### 7. Dados pessoais (LGPD)

- **Colete o mínimo.** O checkout pede CPF porque o gateway exige; a reserva da
  vitrine não pede CPF nem e-mail porque não há cobrança.
- **Não guarde o que não precisa.** O CPF vai ao Asaas e no banco fica só
  `guestCPFMasked` (`checkout/route.ts:110`). Não existe coluna de CPF completo.
- **Apague quando a finalidade acabar.** Liberar uma reserva apaga nome, telefone
  e mensagem — não só o carimbo de data (LGPD art. 15, I e art. 16). No RSVP o
  equivalente é `deleteRsvp`, que remove a linha inteira — é também o caminho
  para o acompanhante que não quer o nome na lista (art. 18, VI), já que quem o
  informou foi outra pessoa.
- **Base legal é execução de contrato (art. 7º, V), não consentimento.** Não use
  checkbox de aceite para dado que é necessário à execução — isso confundiria a
  base legal e daria ao titular um direito de revogação que não se aplica.
- **Campo sensível não atravessa a fronteira server→client.** O padrão é `select`
  explícito **ou** desestruturar o que sai
  (`const { asaasApiKey, walletId, ...publicEvent } = event`), com trava de tipo
  por `Omit<>` para o compilador barrar a volta. Lembre que **tudo** que um Server
  Component passa a um Client Component fica visível em "ver código-fonte".
- Quando o desenho justificar, escreva a barreira como **função pura com teste** —
  `toPublicExternalGift` (`src/lib/external-gift.ts`) tem um teste que falha se o
  telefone reaparecer no payload, e `toAdminRsvp` (`src/lib/rsvp.ts`) tem um que
  falha se um campo novo do modelo entrar no payload do painel.
- **Quando a tabela inteira for privada, prove que ela é privada.** A lista de
  presenças só existe no painel: o convidado escreve por Server Action e nunca
  lê. `tests/rsvp.test.ts` varre `src/app/(public)/` e falha se algum arquivo de
  lá passar a consultar `prisma.rsvp` — é mais confiável do que o `select` de
  cada página, que é fácil de ampliar sem perceber.
- Feature nova que colete dado novo **exige atualizar a política de
  privacidade**. Publicar sem isso deixa a política incorreta, o que é problema de
  conformidade por si só.

### 8. XSS

**Não existe `dangerouslySetInnerHTML` no projeto e não deve passar a existir.**
O JSX escapa por padrão; conteúdo de terceiro (a descrição vinda do Mercado
Livre) é higienizado com `sanitizeMlText` e renderizado como texto.

Para conteúdo que precisa virar embed, o padrão é: allowlist de host no zod →
extrair só o identificador com formato conferido → passar como **prop** para o
componente, nunca concatenar string em HTML → e a CSP `frame-src` como última
trava. É o que o `videoUrl` do YouTube faz.

**O primo disto fora do navegador é a planilha.** O Excel avalia como fórmula
uma célula que começa com `=`, `+`, `-` ou `@`, e `=cmd|'/c calc'!A1` chega a
abrir programa em versões antigas. O CSV de presenças é montado com o nome, o
nome do acompanhante e o recado — todos escritos por qualquer pessoa com o link
do convite — e aberto na máquina do casal. `escapeCsvFormula`
(`src/lib/csv.ts`) prefixa `'` nessas células e é aplicada dentro do `toCsv`,
para não depender de quem chama lembrar. Ao exportar qualquer coisa nova para
planilha, use `toCsv` e não monte a string à mão.

### 9. Rate limiting

`checkRateLimit` devolve o resultado (use em endpoint público, onde a mensagem é
para o visitante); `enforceRateLimit` lança (use em action autenticada,
convertendo para retorno). Chave por `userId` quando há sessão, por IP quando é
anônimo.

Duas decisões opostas e ambas conscientes:

- **O rate limit falha aberto** (`src/lib/rate-limit.ts:66-68`): se o Redis cai, a
  requisição passa. Redis fora do ar não pode derrubar o checkout.
- **O webhook falha fechado** (`webhook/asaas/route.ts:31-34`): sem
  `ASAAS_WEBHOOK_TOKEN` configurado, responde 401. Sem token não há como
  autenticar ninguém, e liberar presente é irreversível.

### 10. Mudança de dado de acesso pede a senha de novo

`verifySession()` prova que existe um JWT válido, **não** que quem está do outro
lado é o dono da conta. Trocar e-mail ou senha muda como se entra — uma sessão
esquecida aberta num computador viraria tomada de conta silenciosa. Por isso
`updateProfile` e `changePassword` (`src/actions/account-actions.ts`) exigem a
senha atual, conferida com `bcrypt.compare`, além do rate limit por usuário.

Limitação registrada: a sessão é um JWT com o id do usuário, então trocar a
senha **não** desconecta os outros navegadores. Fechar as demais sessões exigiria
versionar o token (um campo no `User` comparado no callback do Auth.js).

### 11. Comparação de segredo em tempo constante

`!==` sobre um token vaza o segredo por timing. Use `crypto.timingSafeEqual` com
guarda de comprimento (`webhook/asaas/route.ts:17-25`).

No login, o mesmo cuidado tem outra forma: quando o e-mail não existe, o
`bcrypt.compare` roda contra um **dummy hash de mesmo custo** (`src/auth.ts:22`,
`:52-59`), para o tempo de resposta não virar um oráculo de enumeração de conta.

### 11. Antes de commitar

```bash
pnpm lint && pnpm test && pnpm build
```

Testes cobrem **lógica pura** (`node:test`, imports por caminho relativo). Ao
escrever uma decisão de segurança, extraia-a para um módulo puro em `src/lib/` e
teste-a — é o que permite cobrir allowlist, validação de IP e mascaramento sem
subir banco, Redis ou S3.

---

## Parte 2 — Inventário

### Autenticação

| Item | Onde | Estado |
|---|---|---|
| Provider | `src/auth.ts:33` | `Credentials` único; sem OAuth, sem adapter |
| Hash de senha | `src/auth.ts:11` | bcrypt custo **12** |
| Comparação | `src/auth.ts:52-59` | tempo constante (bcryptjs), com dummy hash de mesmo custo |
| Rehash oportunista | `src/auth.ts:63-68` | regrava se o custo do hash for menor que 12 |
| Sessão | `src/auth.ts:26-31` | JWT, `maxAge` 7 dias |
| Cookies | — | **sem bloco `cookies` explícito**; `httpOnly`/`sameSite: lax`/`secure` vêm do default do Auth.js e dependem de `AUTH_URL` ser https |
| Enumeração de conta | `src/actions/auth.ts:60-62` | cadastro devolve mensagem ambígua |

Baldes de rate limit: `login:ip` 10/15min, `login:email` 5/15min (`auth.ts:46-48`),
`signup:ip` 5/1h, `checkout:ip` 5/10min, `gift:create:userId` 30/1h,
`event:update:userId` 30/1h, `ml:preview:userId` 20/10min,
`external-gift:create:userId` 40/1h, `reserve:ip` 8/10min, `rsvp:ip` 10/10min,
`rsvp:update:userId` 60/1h.

### Cabeçalhos e CSP

`next.config.ts:15-45`, aplicados a `/:path*`:

```
default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self';
frame-ancestors 'none';
script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://placehold.co https://i.ytimg.com;
font-src 'self' data:; media-src 'self' blob:; connect-src 'self';
frame-src https://www.youtube.com https://www.youtube-nocookie.com;
upgrade-insecure-requests
```

Mais HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options:
DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy` restritiva,
`Cross-Origin-Opener-Policy: same-origin`, `poweredByHeader: false`.

`img-src` **não** inclui o CDN do Mercado Livre de propósito: as fotos dos
produtos são baixadas no servidor e servidas por `/api/media`. Isso mantém a CSP
fechada, garante o cache na borda e impede que a loja rastreie quem visita a
página do casamento.

### Fatos que economizam auditoria futura

- **Zero `$queryRaw` / `$executeRaw`** no projeto — todo acesso passa pelo query
  builder do Prisma, parametrizado.
- **Zero `dangerouslySetInnerHTML`**, `innerHTML`, `eval` ou `new Function`.
- **Nenhum open redirect**: todos os destinos de `redirect()`/`redirectTo` são
  literais. A função `authenticate()`, que repassava o FormData cru como opções do
  `signIn` e por isso obedecia um `redirectTo` enviado pelo cliente, **já foi
  removida** (`src/actions/auth.ts:11-13`).
- **CI reprova o build** em vulnerabilidade alta ou crítica de produção
  (`pnpm audit --audit-level=high --prod`).
- **Docker roda como não-root** (`USER node`) e o `CMD` encadeia
  `prisma migrate deploy && next start` — migration quebrada impede o start.

### Pendências conhecidas

Ordenadas por severidade. Nenhuma tem correção nesta entrega, salvo indicação.

1. **`cf-connecting-ip` aceito sem verificar a origem** —
   `src/lib/rate-limit.ts:124-125`. Se o container for alcançável fora da
   Cloudflare/Traefik, forjar o header anula **todos** os limites por IP (login,
   cadastro, checkout, reserva). A garantia depende de o proxy ser o único caminho
   de rede — vale confirmar isso na VPS. Correção de código: só confiar no header
   quando a conexão vier de um IP de borda conhecido.
2. **Webhook sem proteção contra replay** — token estático em header, sem HMAC,
   sem timestamp/nonce e sem rate limit na rota
   (`src/app/api/webhook/asaas/route.ts`). A idempotência é por
   `status === "PAID"`. Mitigado pela reconferência na API do Asaas, que desde
   9/8/2026 checa **status, valor e `externalReference`**.

   > Ao mexer nessa conferência, lembre do parcelamento: `amountCharged` guarda o
   > **total**, mas `GET /payments/<id>` devolve o valor de **uma parcela**. Por
   > isso a comparação usa `total / Transaction.installments`, com folga de um
   > centavo por parcela para o arredondamento do gateway. Transações anteriores
   > à coluna `installments` têm o campo nulo e a conferência é pulada — assumir
   > `1` rejeitaria um parcelamento legítimo ainda pendente e o travaria para
   > sempre, já que a rota responde 200 e o Asaas não reenvia.
3. **`verifySession()` não valida que `session.user.id` está definido** —
   `src/lib/dal.ts:16`. Se `token.sub` faltasse, `where: { userId: undefined }`
   faria o Prisma **descartar o filtro** e devolver o primeiro `Event` da tabela.
   Na prática `sub` sempre existe em sessão JWT, mas a checagem não está lá.
4. **`script-src 'unsafe-inline'`** — `next.config.ts:21`. Anula boa parte do
   valor da CSP contra XSS. Trocar por nonce exige gerar o valor no `proxy.ts` e
   propagá-lo. Também não há `report-uri`, então nenhuma violação é observada.
5. **`asaasApiKey` / `walletId`** — `prisma/schema.prisma:47-48`. Colunas de
   credencial por casal que **nunca são lidas nem escritas** pelo código (a chave
   usada é global, `src/services/asaas.ts:23`) e não têm criptografia em repouso.
   Decidir entre usar ou remover.
6. **Rate limit falha aberto** — deliberado, mas sem `REDIS_URL` não há freio
   nenhum. Monitorar o log `[rate-limit] Redis indisponível`.
7. **`deleteGift` lança sem tratamento no chamador** —
   `gift-actions.ts:101` → `admin/page.tsx`.
8. **Resposta do Asaas não é validada** — `src/services/asaas.ts:35` e `:103-115`
   fazem *cast* com `as`, sem schema zod.
9. **Objetos órfãos no bucket** — excluir um presente remove a linha do banco e
   deixa a imagem no MinIO. Vale uma varredura própria, não um remendo por feature.
10. **Placeholders jurídicos** — `CONTROLADOR` e `CONTATO_ENCARREGADO` em
    `src/app/politica-de-privacidade/page.tsx:17-18` ainda estão entre colchetes; o
    art. 9º da LGPD não está cumprido enquanto isso durar. Levar junto a decisão
    sobre o telefone da reserva ser obrigatório (hoje é, ancorado no art. 7º, V).
11. **`next-auth` em beta** (`5.0.0-beta.32`) sustenta a autenticação;
    `engines.node: ">=20"` está defasado (o toolchain exige 22.13+).
12. **Infra** — pendências registradas em `docs/PROXIMA-SESSAO.md`: bucket MinIO
    ainda aberto em produção e segredos gravados em texto plano nos logs de build
    do EasyPanel (world-readable).

---

## Reportar uma vulnerabilidade

Escreva para o contato de privacidade indicado em `/politica-de-privacidade`.
Não abra issue pública para falha explorável.
