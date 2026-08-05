-- Converte as URLs absolutas do MinIO em chaves de objeto.
--
-- Enquanto o bucket era público, o upload gravava a URL inteira
-- (https://minio.s4r41va.com/bem-casados-bucket/1768178501420-foto.jpg).
-- Agora o bucket é privado e as imagens são servidas por /api/media/<chave>,
-- então o que precisa estar no banco é só a chave.
--
-- Sem este passo, todas as fotos já publicadas quebrariam ao fechar o bucket.
-- URLs externas (placehold.co) são deixadas como estão de propósito: o
-- `mediaUrl()` reconhece endereço absoluto e repassa sem alteração.

UPDATE "GalleryItem"
SET "imageUrl" = regexp_replace("imageUrl", '^https?://[^/]+/[^/]+/', '')
WHERE "imageUrl" LIKE '%/bem-casados-bucket/%';

UPDATE "Gift"
SET "imageUrl" = regexp_replace("imageUrl", '^https?://[^/]+/[^/]+/', '')
WHERE "imageUrl" LIKE '%/bem-casados-bucket/%';
