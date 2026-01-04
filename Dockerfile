# Usa a imagem oficial do Node 22.12 (exigido pelo Prisma 7)
FROM node:22.12.0-alpine

# Instala o OpenSSL (necessário para o Prisma no Alpine Linux)
RUN apk add --no-cache openssl

# Define o diretório de trabalho
WORKDIR /app

# Instala o pnpm globalmente
RUN npm install -g pnpm

# Copia os arquivos de dependência
COPY package.json pnpm-lock.yaml ./

# Instala as dependências do projeto
RUN pnpm install --frozen-lockfile

# Copia o restante do código fonte
COPY . .

# Gera o cliente do Prisma (essencial antes do build)
RUN npx prisma generate

# Faz o build da aplicação Next.js
RUN pnpm build

# Expõe a porta que o Next.js usa
EXPOSE 3000

# Comando para iniciar a aplicação em produção
CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start"]