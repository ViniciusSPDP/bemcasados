// prisma/seeds.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs"; // Importante para criar a senha hash
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("🌱 Iniciando o seed...");

  // 1. Criar o Usuário (Dono do Evento)
  // Vamos definir uma senha padrão "Vinicius123" para testes
  const hashedPassword = await bcrypt.hash("Vinicius123@", 10);

  const user = await prisma.user.upsert({
    where: { email: "noivos@teste.com" },
    update: {}, // Se já existe, não faz nada
    create: {
      name: "Romeu e Julieta",
      email: "noivos@teste.com",
      password: hashedPassword,
    },
  });

  console.log(`👤 Usuário criado/encontrado: ${user.email} (Senha: 123456)`);

  // 2. Criar o Evento vinculado ao Usuário
  const event = await prisma.event.upsert({
    where: { slug: "casamento-teste" },
    update: {
        userId: user.id // Garante que o evento esteja vinculado caso já existisse
    }, 
    create: {
      slug: "casamento-teste",
      title: "Casamento Teste & Sandbox",
      coupleName: "Romeu & Julieta",
      eventDate: new Date("2025-12-25"),
      userId: user.id, // <--- OBRIGATÓRIO AGORA
    },
  });

  console.log(`💍 Evento criado: ${event.title}`);

  // 3. Criar os Presentes
  const gifts = [
    { title: "Cotinha da Lua de Mel", price: 100.0, category: "Viagem" },
    { title: "Jantar Romântico", price: 250.0, category: "Experiência" },
    { title: "Geladeira Inox", price: 2500.0, category: "Cozinha" },
    { title: "Máquina de Lavar", price: 1800.0, category: "Lavanderia" },
  ];

  for (const gift of gifts) {
    const existing = await prisma.gift.findFirst({
        where: { title: gift.title, eventId: event.id }
    });

    if (!existing) {
        await prisma.gift.create({
        data: {
            ...gift,
            eventId: event.id,
            imageUrl: `https://placehold.co/600x400?text=${encodeURIComponent(gift.title)}`,
        },
        });
        console.log(`🎁 Presente adicionado: ${gift.title}`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });