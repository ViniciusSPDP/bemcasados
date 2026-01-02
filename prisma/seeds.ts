// prisma/seeds.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
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
  const event = await prisma.event.upsert({
    where: { slug: "casamento-teste" },
    update: {},
    create: {
      slug: "casamento-teste",
      title: "Casamento Teste & Sandbox",
      coupleName: "Romeu & Julieta",
      eventDate: new Date("2025-12-25"),
    },
  });

  console.log(`💍 Evento criado: ${event.title}`);

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
