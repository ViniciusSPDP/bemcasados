-- Deixa de armazenar o CPF completo dos convidados (LGPD: minimização de dados).
--
-- O CPF continua sendo enviado ao Asaas para emitir a cobrança — lá ele é
-- necessário e o gateway é o operador. Aqui fica apenas a máscara, que basta
-- para o casal conferir um pagamento e para atendimento.
--
-- ATENÇÃO: este passo é IRREVERSÍVEL. A coluna com os CPFs em texto plano é
-- removida e os valores originais não podem ser recuperados. É exatamente esse
-- o objetivo — anonimizar o histórico já coletado.

-- 1. Nova coluna, inicialmente opcional para permitir o backfill.
ALTER TABLE "Transaction" ADD COLUMN "guestCPFMasked" TEXT;

-- 2. Backfill: converte os CPF/CNPJ existentes em máscara.
UPDATE "Transaction"
SET "guestCPFMasked" = CASE
  -- CPF: 11 dígitos -> •••.•••.789-••
  WHEN length(regexp_replace("guestCPF", '\D', '', 'g')) = 11
    THEN '•••.•••.' || substr(regexp_replace("guestCPF", '\D', '', 'g'), 7, 3) || '-••'
  -- CNPJ: 14 dígitos -> ••.•••.•••/0001-••
  WHEN length(regexp_replace("guestCPF", '\D', '', 'g')) = 14
    THEN '••.•••.•••/' || substr(regexp_replace("guestCPF", '\D', '', 'g'), 9, 4) || '-••'
  ELSE '•••••••••••'
END;

-- 3. Torna obrigatória agora que todas as linhas têm valor.
ALTER TABLE "Transaction" ALTER COLUMN "guestCPFMasked" SET NOT NULL;

-- 4. Remove os CPFs em texto plano.
ALTER TABLE "Transaction" DROP COLUMN "guestCPF";

-- 5. Cascatas de exclusão.
--    Apagar um presente que já tinha transação falhava por FK, e apagar um
--    evento falhava por causa dos presentes. Sem isso não há como atender um
--    pedido de exclusão de conta (LGPD art. 18).
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_giftId_fkey";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_giftId_fkey"
  FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Gift" DROP CONSTRAINT IF EXISTS "Gift_eventId_fkey";
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
