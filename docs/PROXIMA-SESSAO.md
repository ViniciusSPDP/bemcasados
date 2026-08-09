# Próxima sessão — vitrine de presentes do Mercado Livre

Handoff escrito em 2026-08-06. Leia o `CLAUDE.md` antes — ele tem as regras de
negócio e as decisões de segurança que não devem ser revertidas.

---

## O que construir

Uma **tela nova e separada**: uma vitrine de produtos do Mercado Livre onde o
convidado clica, vai para o ML e compra lá. O casal monta essa vitrine colando
links curtos (`https://meli.la/1Sq9Q2D`), e o sistema puxa foto, título e
descrição do produto automaticamente.

Como a compra acontece fora do nosso sistema, o convidado **reserva** o presente
para avisar que vai dar aquele — é o que impede presente repetido.

### O que NÃO muda

A lista atual (Asaas, dinheiro, taxas, CPF, webhook) **fica exatamente como
está**. Não encostar nela. As duas convivem: uma é contribuição em dinheiro, a
outra é vitrine de afiliado.

Consequência: nesta tela nova **não existe** Asaas, `fees.ts`, CPF nem webhook
de pagamento. É bem mais simples que o fluxo atual.

---

## Decisões já tomadas pelo Vinicius

| Tema | Decisão |
|---|---|
| Modelo | Vitrine/afiliado. Sem cobrança nossa; o convidado compra no ML |
| Escopo | Tela nova e separada; o fluxo Asaas não muda em nada |
| Expiração da reserva | **Não expira.** O casal libera manualmente pelo painel |
| Dados de quem reserva | **Nome, telefone e mensagem** |
| Convite virtual | **Adiado** — ele ainda vai definir o escopo |

### Sobre a reserva não expirar

Como não há prazo, o painel do casal **precisa** de um botão para devolver o
item à vitrine. Sem isso, um clique por engano trava o presente para sempre e
não há saída. Esse botão não é opcional.

### Sobre o telefone — atenção LGPD

Telefone é dado pessoal, e a coleta é nova. A
`/politica-de-privacidade` que escrevemos **descreve exatamente** os dados
coletados hoje e não menciona telefone nem reserva. Publicar a feature sem
atualizar a política deixa a política **incorreta**, o que é problema de
conformidade por si só.

Precisa entrar na política: que coletamos telefone na reserva, para quê (o casal
entrar em contato sobre o presente), base legal e por quanto tempo fica
guardado.

---

## Link de afiliado — não perder a comissão

O link `https://meli.la/1Sq9Q2D` é um encurtador do ML e **provavelmente já
carrega o código de afiliado do Vinicius**. Se resolvermos o link e guardarmos
só o endereço final, a comissão se perde.

**Guardar sempre o link curto original** e usá-lo no botão "Comprar". O endereço
resolvido serve apenas internamente, para buscar os dados do produto.

---

## Restrições de segurança

### SSRF — o risco novo mais importante

Resolver o link significa **o servidor buscar uma URL que o usuário forneceu**.
O projeto não tem nenhuma superfície dessas hoje; esta é a primeira.

O servidor enxerga a rede interna: o painel do EasyPanel em `localhost:3000`
(bloqueado pelo ufw só de fora), o Postgres em `dados_bem_casados_db:5432`, o
MinIO, e o endereço de metadados de nuvem `169.254.169.254`.

Obrigatório:

- Allowlist de host **antes** de qualquer requisição: só `meli.la`,
  `mercadolivre.com.br`, `mercadolibre.com`, `produto.mercadolivre.com.br`.
- Revalidar o host **a cada redirecionamento**, limitando a ~3 saltos. O
  encurtador pode apontar para qualquer lugar no meio do caminho.
- Recusar IP privado/loopback/link-local depois de resolver o DNS.
- Timeout curto (~5s) e limite de tamanho da resposta.
- Rate limit — reusar `enforceRateLimit` de `src/lib/rate-limit.ts`.

### Imagem do produto

A CSP em `next.config.ts` só permite `img-src 'self' data: blob:
https://placehold.co https://i.ytimg.com`. As imagens do ML vêm de
`http2.mlstatic.com`.

**Baixar a imagem e passar pelo `uploadFileToS3`**, em vez de linkar direto.
Reusa a validação por magic bytes e a compressão WebP, mantém a CSP fechada,
garante o cache na borda e evita que o ML rastreie os convidados. Só requer
aceitar `Buffer` além de `File` na função.

### Demais

- Schemas zod em `src/lib/definitions.ts`, junto dos outros.
- Server Action começa com `verifySession()` e **retorna** erro de validação
  (não lança — o Next mascara a mensagem em produção).
- Sanitizar a descrição vinda do ML. Não usar `dangerouslySetInnerHTML`.
- Rate limit na reserva: é endpoint público e anônimo, como o checkout.
- Validar o telefone com zod; guardar só dígitos.

---

## Esboço técnico

### Verificar primeiro

A API pública do ML (`https://api.mercadolibre.com/items/MLB<id>`) ainda
responde sem autenticação? O ML vem restringindo. Se exigir OAuth, entra
credencial nova e um fluxo de app — **isso decide a abordagem**. Fallback:
ler as meta tags OpenGraph da página do produto (mais frágil, sem credencial).

### Schema

Decidir entre um modelo novo ou reaproveitar `Gift` com um discriminador. Como
os dois tipos de presente têm campos e fluxos bem diferentes (um tem preço,
taxa e transação; o outro tem link, reserva e telefone), **um modelo separado
tende a ficar mais limpo** e não arrisca o fluxo do Asaas:

```prisma
model ExternalGift {
  id          String   @id @default(uuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  title       String
  description String?  @db.Text
  imageUrl    String?  // chave no nosso bucket, não URL do ML
  shortUrl    String   // link curto ORIGINAL — preserva a comissão
  externalId  String?  // MLB123456789, para deduplicar

  // Reserva (não expira; o casal libera)
  reservedAt      DateTime?
  reservedName    String?
  reservedPhone   String?
  reservedMessage String?  @db.Text

  orderIndex  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

`Event` ganha `externalGifts ExternalGift[]`.

### Arquivos

| Arquivo | O quê |
|---|---|
| `prisma/schema.prisma` + migration | modelo novo |
| `src/services/mercadolivre.ts` *(novo)* | resolver link, allowlist anti-SSRF, buscar produto |
| `src/actions/external-gift-actions.ts` *(novo)* | importar, remover, liberar reserva |
| `src/actions/reservation-actions.ts` *(novo)* | reservar (público, com rate limit) |
| `src/lib/definitions.ts` | schemas do link, da reserva e do telefone |
| `src/lib/s3.ts` | aceitar `Buffer` além de `File` |
| `src/app/(public)/[slug]/` | rota da vitrine |
| `src/app/(private)/admin/` | aba de gerenciar a vitrine + botão de liberar reserva |
| `src/app/politica-de-privacidade/` | incluir telefone e reserva |
| `tests/` | allowlist/SSRF, validação de telefone |

---

## Estado do projeto

- Produção: `ce20f2e` no ar e saudável (site, login, imagens, rate limit
  verificados).
- `9c15a28` (cache de build) está na `main` mas **não foi deployado** — o ganho
  de tempo de build ainda não foi medido.
- Auditoria de dependências: 0 críticas, 0 altas em produção.
- Imagens: 2,3s → 0,06s com cache quente; 19 imagens em 1,31s.

### Pendências do usuário

1. **Bucket MinIO segue aberto** — decisão dele de adiar. 72 objetos
   enumeráveis. O código já não depende disso.
2. **Segredos nos logs de build** do EasyPanel — limpar e decidir sobre rotação.
3. **Cryptominer no `rh-recrutamento`** — binário sumiu, vetor de entrada não
   investigado. Outro projeto, não mexer sem autorização.
4. **Placeholders jurídicos** em `/politica-de-privacidade` e `/termos-de-uso`.

---

## Prompt para colar na próxima sessão

```
Leia CLAUDE.md e docs/PROXIMA-SESSAO.md primeiro — as decisões já estão
tomadas lá, não precisa me perguntar de novo.

Implemente a vitrine de presentes do Mercado Livre:

- Tela NOVA e separada. O fluxo atual do Asaas não muda em nada.
- O casal cola um link curto do ML (https://meli.la/...) e o sistema puxa
  foto, título e descrição. Guarde o link curto ORIGINAL para não perder a
  comissão de afiliado.
- O convidado clica e compra direto no ML. Não passa cobrança pela gente.
- Botão de reservar, com nome, telefone e mensagem. A reserva NÃO expira; o
  painel do casal tem um botão para liberar o presente de volta.
- Baixe a imagem do ML para o nosso bucket via uploadFileToS3 em vez de
  linkar direto.
- Atenção ao SSRF: allowlist de host revalidada a cada redirecionamento.
- Atualize a política de privacidade para incluir telefone e reserva.

Comece confirmando se a API pública do ML ainda responde sem autenticação
para https://api.mercadolibre.com/items/MLB<id>.

O convite de casamento virtual fica para depois — ainda vou definir.
```
