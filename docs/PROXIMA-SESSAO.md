# Próxima sessão — lista de presentes com Mercado Livre + convite virtual

Documento de handoff escrito em 2026-08-06, ao final da sessão de auditoria de
segurança. Leia o `CLAUDE.md` antes — ele tem as regras de negócio e as decisões
de segurança que não devem ser revertidas.

---

## O que o Vinicius pediu

> "preciso criar uma nova lista de presente e um convite de casamento virtual.
> nessa lista de presente os produtos vão ter que pegar as informações como foto,
> descrição do Mercado Livre e colocar o link, e ter um botão de reservar para
> caso alguém for dar o presente reservar o produto para não dar repetido.
> o link vem assim `https://meli.la/1Sq9Q2D`"

Três frentes:

1. **Importar produto do Mercado Livre** a partir de um link curto — puxar foto,
   título e descrição automaticamente.
2. **Botão de reservar** — impedir que dois convidados deem o mesmo presente.
3. **Convite de casamento virtual** — escopo ainda indefinido.

---

## Perguntas que precisam ser respondidas antes de codar

Estas mudam materialmente o que é construído. Não assuma:

### Sobre o modelo de negócio

1. **O presente do Mercado Livre é comprado ou continua sendo dinheiro?**
   Hoje o BemCasados é 100% contribuição em dinheiro — não há entrega, estoque
   nem produto físico. Puxar dados do ML pode significar duas coisas bem
   diferentes:
   - **(a) Vitrine**: o ML só ilustra o presente; o convidado continua pagando
     via Asaas e o casal compra depois. Encaixa no modelo atual.
   - **(b) Compra direta**: o convidado vai ao ML e compra de verdade. Aí não há
     transação no Asaas, e "reservar" passa a ser o mecanismo principal.

   **Isso muda tudo** — inclusive se a taxa de `fees.ts` se aplica.

2. **Reserva e pagamento convivem?** Se o convidado reserva mas nunca paga, o
   presente fica travado. Precisa de prazo de expiração (sugestão: 48h) e de um
   jeito de o casal liberar manualmente.

3. **Quem reserva não está logado.** Convidado é anônimo. Como ele desfaz uma
   reserva feita por engano? Sugestão: token em cookie + link "cancelar minha
   reserva" enviado por e-mail.

4. **O convite virtual é o quê?** Uma página nova? RSVP com confirmação de
   presença? Contagem de acompanhantes? Envio por WhatsApp? Hoje não existe
   nada disso no projeto.

### Sobre o Mercado Livre

5. **A API pública do ML ainda atende sem autenticação?** O endpoint
   `https://api.mercadolibre.com/items/MLB<id>` era público, mas o ML vem
   restringindo. Se exigir OAuth, entra credencial nova e um fluxo de app.
   **Verificar isso primeiro** — é o que decide a viabilidade da abordagem.

6. **Fallback se a API fechar:** ler as meta tags OpenGraph da página do produto.
   Mais frágil e mais fácil de quebrar, mas não precisa de credencial.

---

## Restrições de segurança que a implementação precisa respeitar

Vêm da auditoria recente. Quebrar qualquer uma delas reintroduz um problema que
já foi corrigido.

### SSRF — o risco novo mais importante

Resolver `https://meli.la/1Sq9Q2D` significa **o servidor buscar uma URL que o
usuário forneceu**. Hoje o projeto não tem nenhuma superfície de SSRF; isto
cria a primeira. Obrigatório:

- Allowlist de host **antes** de qualquer requisição: só `meli.la`,
  `mercadolivre.com.br`, `mercadolibre.com`, `produto.mercadolivre.com.br`.
- Revalidar o host **a cada redirecionamento** — o encurtador pode apontar para
  qualquer lugar. Limitar a ~3 saltos.
- Recusar IP privado/loopback/link-local após resolver DNS (bloqueia
  `169.254.169.254` e a rede interna do Swarm).
- Timeout curto (~5s) e limite de tamanho de resposta.
- Rate limit por usuário — reusar `enforceRateLimit` de `src/lib/rate-limit.ts`.

### Imagem do produto

A CSP atual (`next.config.ts`) só permite `img-src 'self' data: blob:
https://placehold.co https://i.ytimg.com`. As imagens do ML vêm de
`http2.mlstatic.com`.

**Recomendação: baixar a imagem e passar pelo `uploadFileToS3`.** Isso reusa a
validação por magic bytes, a compressão WebP e o cache na borda, mantém a CSP
fechada e evita que o ML rastreie os convidados. Só requer aceitar `Buffer` além
de `File` na função.

Adicionar `mlstatic.com` à CSP é a alternativa, mas abre um host de terceiro e
perde a compressão.

### Demais

- Validar o link com zod em `src/lib/definitions.ts`, junto dos outros schemas.
- Server Action nova começa com `verifySession()` e **retorna** erro de
  validação (não lança — o Next mascara a mensagem em produção).
- Sanitizar a descrição vinda do ML antes de renderizar. Não usar
  `dangerouslySetInnerHTML`; o projeto hoje tem zero ocorrências disso.
- Não logar objeto de erro inteiro em caminho com dado de convidado.

---

## Esboço técnico

### Schema (`prisma/schema.prisma`)

`Gift` provavelmente ganha:

```prisma
externalUrl      String?   // link do produto no ML
externalProductId String?  // MLB123456789, para deduplicar
description      String?   @db.Text   // já existe
```

Reserva — decidir entre duas formas:

```prisma
// (a) simples, direto no Gift
reservedAt       DateTime?
reservedByName   String?
reservedByEmail  String?
reservationToken String?   @unique  // permite o convidado cancelar

// (b) tabela própria, se precisar de histórico
model Reservation { ... }
```

A (a) basta se só interessa o estado atual. A (b) se o casal quiser ver quem
reservou e desistiu.

**Atenção:** `Gift.available` hoje só vira `false` no webhook de pagamento
confirmado (`src/app/api/webhook/asaas/route.ts`). Reserva é um estado
**diferente** de vendido — não reaproveitar o mesmo campo, ou o histórico de
pagamento fica ambíguo.

### Arquivos que devem mudar

| Arquivo | O quê |
|---|---|
| `prisma/schema.prisma` + migration | campos de reserva e do produto externo |
| `src/lib/definitions.ts` | schema zod do link do ML e do formulário de reserva |
| `src/services/mercadolivre.ts` *(novo)* | resolver link curto, buscar produto, allowlist anti-SSRF |
| `src/actions/gift-actions.ts` | ação de importar produto do ML |
| `src/actions/reservation-actions.ts` *(novo)* | reservar / cancelar |
| `src/lib/s3.ts` | aceitar `Buffer` além de `File` para baixar a imagem do ML |
| `src/components/private/admin/gift-form.tsx` | campo de colar o link |
| `src/app/(public)/[slug]/public-page-content.tsx` | botão de reservar |
| `next.config.ts` | só se optar por CSP em vez de baixar a imagem |
| `tests/` | casos de allowlist/SSRF e expiração de reserva |

### Convite virtual

Sem escopo definido. Se for página nova, cabe em `src/app/(public)/[slug]/convite/`
reusando os dados do `Event`. Lembrar de adicionar o slug a `RESERVED_SLUGS` se
virar rota fixa.

---

## Estado em que o projeto ficou

- Produção: `ce20f2e` no ar e saudável. Site, login, imagens e rate limit
  verificados funcionando.
- `9c15a28` (cache de build) está na `main` mas **não foi deployado** — o ganho
  de tempo de build ainda não foi medido.
- Auditoria de dependências: **0 críticas, 0 altas** em produção.
- Imagens: 2,3s → 0,06s (cache quente); 19 imagens em 1,31s.

### Pendências do usuário

1. **Bucket MinIO segue aberto** — decisão dele de adiar. 72 objetos
   enumeráveis. O código já não depende disso.
2. **Segredos nos logs de build** do EasyPanel — limpar e decidir sobre rotação.
3. **Cryptominer no `rh-recrutamento`** — binário sumiu, vetor de entrada não
   investigado. Outro projeto, não mexer sem autorização.
4. **Placeholders jurídicos** em `/politica-de-privacidade` e `/termos-de-uso`
   (`[RAZÃO SOCIAL]`, `[CNPJ]`, e-mail do encarregado).

---

## Prompt para colar na próxima sessão

```
Leia CLAUDE.md e docs/PROXIMA-SESSAO.md primeiro.

Quero implementar duas features no BemCasados:

1. LISTA DE PRESENTES COM MERCADO LIVRE
   O casal cola um link curto do ML (ex: https://meli.la/1Sq9Q2D) e o sistema
   puxa automaticamente foto, título e descrição do produto, guardando o link.

2. BOTÃO DE RESERVAR
   O convidado reserva um presente para ninguém dar repetido.

3. CONVITE DE CASAMENTO VIRTUAL
   (escopo a definir comigo)

Antes de codar, me pergunte o que estiver em aberto — principalmente:
- o presente do ML continua sendo contribuição em dinheiro via Asaas, ou o
  convidado compra direto no ML?
- reserva expira em quanto tempo?
- o convite virtual tem RSVP ou é só página?

Confirme também se a API pública do Mercado Livre ainda responde sem
autenticação para https://api.mercadolibre.com/items/MLB<id> — isso decide a
abordagem.

Atenção ao SSRF: resolver o link do usuário no servidor é superfície nova.
docs/PROXIMA-SESSAO.md tem os requisitos.
```
