 import { PrismaClient } from "@prisma/client";
 import { PrismaPg } from "@prisma/adapter-pg";
 import { Pool } from "pg";


 const globalForPrisma = global as unknown as { prisma: PrismaClient };
 const connectionString = process.env.DATABASE_URL!;
 const pool = new Pool({ connectionString });
 const adapter = new PrismaPg(pool);

 export const prisma =
   globalForPrisma.prisma ||
   new PrismaClient({
        adapter,
        // `"query"` imprime os parâmetros da consulta — e-mail, CPF e hash de
        // senha iam parar no stdout. Para depurar uma query pontual, ative
        // manualmente e desative depois.
        log: ["error", "warn"],
      });
 if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;