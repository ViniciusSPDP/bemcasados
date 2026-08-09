-- Campos do convite virtual (`/{slug}/convite`).
--
-- Todos nullable de propósito: os eventos que já existem foram criados antes
-- desta tela e continuam válidos. O convite simplesmente não renderiza a seção
-- cujo campo estiver vazio.
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "monogram" TEXT,
ADD COLUMN     "inviteVerse" TEXT,
ADD COLUMN     "ceremonyTime" TEXT,
ADD COLUMN     "ceremonyVenue" TEXT,
ADD COLUMN     "ceremonyAddress" TEXT,
ADD COLUMN     "ceremonyMapsUrl" TEXT;
