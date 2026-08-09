-- Imagem de fundo do convite, separada da galeria dos stories.
--
-- Guarda a CHAVE do objeto no bucket (`<uuid>.webp`), nunca uma URL — igual a
-- `Gift.imageUrl` e `GalleryItem.imageUrl`. A rota `/api/media` precisa
-- reconhecer esta coluna, senão a imagem existe no bucket e responde 404.
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "inviteImageUrl" TEXT;
