import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});

async function main() {
  console.log("🌱 Iniciando o seed...");

  // Sem valor padrão de propósito. A senha que estava aqui como fallback ficava
  // versionada no repositório e criaria um admin de senha conhecida em qualquer
  // ambiente onde ADMIN_PASSWORD não fosse definida.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar o seed."
    );
  }

  if (adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD deve ter ao menos 12 caracteres.");
  }

  console.log(`📧 Usando e-mail: ${adminEmail}`);

  // 1. Criar o Usuário (Dono do Evento)
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword, // Atualiza a senha se você mudar na variável de ambiente
    },
    create: {
      name: "Casal Bem Casados",
      email: adminEmail,
      password: hashedPassword,
    },
  });

  console.log(`👤 Usuário configurado com sucesso.`);

  // 2. Criar o Evento vinculado ao Usuário
  const eventData = {
    slug: "casamento-principal", // Você pode mudar isso também se quiser via ENV
    title: "Nosso Casamento",
    coupleName: "Noivos Felizes",
    eventDate: new Date("2025-12-25"),
    userId: user.id,
    introTitle: "VOCÊ FOI CONVOCADO",
    introSubtitle: "PARA CELEBRAR O AMOR",
    welcomeMessage: "Estamos muito felizes em compartilhar este momento único com vocês.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  };

  const event = await prisma.event.upsert({
    where: { slug: eventData.slug },
    update: eventData,
    create: eventData,
  });

  console.log(`💍 Evento atualizado/criado: ${event.title}`);

  // 3. Criar os Itens da Galeria (Stories)
  const galleryItems = [
    { 
      caption: "Onde tudo começou...", 
      imageUrl: "https://placehold.co/1080x1920/9f1239/fff?text=Nossa+Historia",
      orderIndex: 0
    },
    { 
      caption: "O pedido de casamento!", 
      imageUrl: "https://placehold.co/1080x1920/881337/fff?text=O+Pedido",
      orderIndex: 1
    },
    { 
      caption: "Pré-wedding na praia", 
      imageUrl: "https://placehold.co/1080x1920/4c0519/fff?text=Pre+Wedding",
      orderIndex: 2
    },
  ];

  for (const item of galleryItems) {
    const existing = await prisma.galleryItem.findFirst({
        where: { eventId: event.id, orderIndex: item.orderIndex }
    });

    if (!existing) {
        await prisma.galleryItem.create({
            data: { ...item, eventId: event.id }
        });
    }
  }

  // 4. Criar os Presentes
  const gifts = [
    { title: "Cotinha da Lua de Mel", price: 100.0, category: "Viagem" },
    { title: "Jantar Romântico", price: 250.0, category: "Experiência" },
    { title: "Geladeira Inox", price: 2500.0, category: "Cozinha" },
    { title: "Máquina de Lavar", price: 1800.0, category: "Lavanderia" },
    { title: "Jogo de Panelas", price: 450.0, category: "Cozinha" },
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
            imageUrl: `https://placehold.co/600x400/rose/white?text=${encodeURIComponent(gift.title)}`,
        },
        });
    }
  }
  
  console.log("✅ Seed finalizado com sucesso!");
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