# Confirmação de presença — plano

Escrito em 2026-08-09. É a última peça do convite: hoje o terceiro ícone
(`Confirmar presença`) mostra "em breve".

## Decisões do Vinicius

| Tema | Decisão |
|---|---|
| Acesso | **Aberto** — qualquer um com o link confirma. Sem cadastro prévio |
| Acompanhantes | **Nome de cada um**, não só a quantidade |
| Recusa | **Registrar também quem não vai**, com recado opcional |
| Prazo | **Sem data limite** |

O acesso aberto casa com a reserva de presente, que já funciona assim, e não
exige o casal cadastrar ninguém antes. A consequência aceita: como o link circula
em grupo de WhatsApp, alguém não convidado pode confirmar. Para casamento, é raro
e o casal vê a lista.

---

## Modelo

```prisma
model Rsvp {
  id      String @id @default(uuid())
  eventId String
  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)

  name    String
  phone   String  // só dígitos, como em ExternalGift.reservedPhone
  // "SIM" | "NAO". String e não enum, seguindo o resto do schema
  // (`Transaction.status` é assim).
  status  String
  message String? @db.Text

  // Nomes dos acompanhantes, na ordem em que foram digitados. Um array de
  // texto evita uma tabela e um join para uma lista curta que sempre é lida
  // inteira, junto com o convidado que a preencheu.
  companions String[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Um telefone confirma uma vez por evento. É o que permite ao convidado
  // corrigir a resposta em vez de criar uma segunda linha — e o que impede a
  // lista de encher de duplicata quando alguém envia duas vezes.
  @@unique([eventId, phone])
  @@index([eventId, createdAt])
}
```

`Event` ganha `rsvps Rsvp[]`.

**Por que `companions` como array e não tabela:** a lista é curta (2–5 nomes),
nunca é consultada sozinha e sempre acompanha o convidado. Uma tabela filha
custaria join em toda leitura do painel sem nada em troca. O Postgres tem
`text[]` nativo e o Prisma o suporta — sem serialização manual.

**Total de pessoas** é `1 + companions.length`, calculado na leitura. Guardar o
número junto abriria a chance de ele divergir dos nomes.

---

## Fluxo do convidado

1. Toca em **Confirmar presença** no convite → abre um `<Dialog>`, o mesmo
   componente da reserva de presente.
2. Escolhe **Vou** ou **Não vou** (dois botões grandes, não um `<select>`).
3. Preenche nome e telefone. Se escolheu "vou", pode acrescentar acompanhantes —
   um campo por pessoa, com botão de somar e remover, teto de 5.
4. Recado opcional.
5. Envia. Tela de sucesso dentro do próprio diálogo.

**Se o telefone já respondeu**, a ação atualiza a resposta em vez de recusar, e a
tela diz "Atualizamos a sua confirmação". É o que resolve o caso real de a pessoa
mudar de ideia ou ter errado o número de acompanhantes — sem isso ela tentaria de
novo e receberia um erro sem saída.

Quem escolhe "não vou" não vê os campos de acompanhante.

---

## Painel do casal

Aba nova **Presenças**, ao lado de Convite e Vitrine.

**No topo, quatro números:** confirmados (pessoas, não respostas), recusas,
respostas totais e acompanhantes. O número que o casal leva ao bufê é o de
*pessoas*, então ele precisa vir somado e em destaque.

**Lista** com nome, telefone (com `tel:` para ligar, como na vitrine), status,
acompanhantes e recado. Filtro por status e busca por nome.

**Exportar CSV** — o casal leva a lista para o bufê ou para quem organiza a
entrada. Reusa o formato que a importação já entende.

**Excluir uma resposta** — para tirar o teste do primo ou um engano. Confirmação
em dois passos, como no resto do painel.

---

## Arquivos

| Arquivo | O quê |
|---|---|
| `prisma/schema.prisma` + migration | modelo `Rsvp` |
| `src/lib/definitions.ts` | `RsvpSchema` — reusa `onlyDigits` e `isValidBrazilianPhone` |
| `src/actions/rsvp-actions.ts` *(novo)* | `submitRsvp` (pública), `deleteRsvp` (privada) |
| `src/components/public/rsvp-dialog.tsx` *(novo)* | formulário do convidado |
| `src/app/(public)/[slug]/convite/invite-content.tsx` | ligar o terceiro ícone |
| `src/app/(public)/[slug]/convite/page.tsx` | passar `slug` para o diálogo |
| `src/components/private/admin/rsvp-list.tsx` *(novo)* | lista, contadores, filtro, CSV |
| `src/app/(private)/admin/page.tsx` | aba **Presenças** |
| `src/app/politica-de-privacidade/page.tsx` | **bloqueante** — ver abaixo |
| `tests/rsvp.test.ts` *(novo)* | schema, contagem de pessoas, geração do CSV |

O que já existe e será copiado quase literal:

- `src/actions/reservation-actions.ts` — ação pública anônima: sem
  `verifySession()` de propósito, `getClientIp(await headers())`,
  `checkRateLimit` (não `enforce`, porque a mensagem é para o visitante), e o
  cuidado de não ecoar `issues` com o valor recebido, que aqui carrega telefone.
- `src/components/public/reserve-gift-dialog.tsx` — estados de envio, erro e
  sucesso, e o aviso de LGPD com link para a política.
- `src/lib/phone.ts` — `onlyDigits` (que já corta o `+55` do autofill) e
  `isValidBrazilianPhone`.

---

## Segurança

Nada aqui é novo: são as mesmas regras do `SECURITY.md`, aplicadas.

- **Ação pública e anônima.** Sem `verifySession()`, como a reserva. O que
  protege é o rate limit por IP (`rsvp:${ip}`, 10 por 10 min) e o zod.
- **Duplicata resolvida no banco**, não em código: `upsert` sobre
  `@@unique([eventId, phone])`. Duas submissões simultâneas do mesmo telefone
  não criam duas linhas — o mesmo raciocínio do `updateMany` da reserva.
- **Telefone só dígitos**, normalizado no schema.
- **Nome de acompanhante é texto puro**, renderizado pelo JSX. Teto de 5 nomes e
  120 caracteres cada, senão o campo vira depósito de texto.
- **A lista de presenças nunca vai para o payload público.** Ela só existe no
  painel, atrás de `verifySession()` e filtrada por `eventId` do próprio casal.
  Vale escrever a barreira como função pura com teste, no mesmo espírito de
  `toPublicExternalGift`.
- **Não logar o objeto de erro** no caminho da confirmação: ele carrega o
  telefone.

---

## LGPD — **já feito**

A política de privacidade foi atualizada em 2026-08-09, antes da implementação,
para a feature não ficar pronta e travada esperando texto jurídico. Já constam:

- **Seção 2** — o que a confirmação coleta, incluindo o **nome dos
  acompanhantes**, com o aviso de que esse nome é informado por outra pessoa e
  como pedir a remoção.
- **Seção 3** — base legal: execução de contrato e procedimentos preliminares a
  pedido do titular, art. 7º V (o mesmo da reserva).
- **Seção 4** — a lista de presenças fica só no painel do casal; nenhum convidado
  vê quem mais vai.
- **Seção 5** — retenção enquanto a conta existir, e o casal pode apagar uma
  confirmação pelo painel a qualquer momento.

> **Atenção ao publicar:** a política já descreve uma coleta que **ainda não
> acontece**. Descrever a mais é o lado conservador, mas o certo é os dois irem
> ao ar juntos. Se a decisão for adiar o RSVP por muito tempo, vale reverter
> esses trechos.

> **Para o jurídico**, junto dos placeholders já pendentes: o nome do
> acompanhante é informado por outra pessoa. O desenho mais confortável seria
> pedir só o primeiro nome ou a quantidade. A decisão registrada é nome completo;
> vale levantar na revisão.

Publicar sem isso deixa a política **incorreta**, que é problema por si só.

---

## O que NÃO entra nesta primeira versão

- **Convite individual por família** (lista fechada) — foi avaliado e recusado.
- **Prazo para confirmar** — decisão de não ter.
- **Lembrete automático** por WhatsApp ou e-mail — exigiria integração nova.
- **Mesa/assento** — o casal resolve fora do sistema com o CSV.
- **Restrição alimentar** — fácil de acrescentar depois (um campo de texto), mas
  não foi pedido.

---

## Ordem de implementação

1. Schema + migration
2. `RsvpSchema` e a barreira pura de leitura + testes
3. `submitRsvp` com `upsert` e rate limit
4. `rsvp-dialog.tsx` e ligação do terceiro ícone do convite
5. Aba **Presenças**: contadores, lista, filtro, exclusão
6. Exportar CSV
7. Política de privacidade
8. `pnpm lint && pnpm test && pnpm build`

Estimativa: parecido com a vitrine, um pouco menor — não há SSRF, download de
imagem nem integração externa.

---

## Roteiro de verificação

- Confirmar com 2 acompanhantes → painel mostra **3 pessoas** naquela linha.
- Confirmar de novo com o mesmo telefone, mudando para 1 acompanhante → a linha é
  **atualizada**, não duplicada, e o contador cai para 2.
- Escolher "não vou" → some o campo de acompanhante; a resposta entra na coluna
  de recusas e não soma ao total de pessoas.
- Telefone inválido, nome curto, 6 acompanhantes → recusados com mensagem clara.
- `Ctrl+U` no convite e na vitrine → **nenhum** nome ou telefone de quem
  confirmou pode aparecer.
- Duas abas confirmando o mesmo telefone ao mesmo tempo → uma linha só.
- CSV baixado abre no Excel com acento correto (BOM) e separador `;`.
