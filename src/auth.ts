import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod"
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp } from "./lib/rate-limit";
import { headers } from "next/headers";

/** Custo do bcrypt para hashes novos. Contas antigas foram criadas com 10. */
export const BCRYPT_COST = 12;

/**
 * Hash descartável usado quando o e-mail não existe. Sem ele, a resposta para
 * um e-mail inexistente volta na hora e a de um e-mail válido demora o tempo do
 * bcrypt — a diferença permite enumerar contas cronometrando o login.
 *
 * Precisa ter o mesmo custo dos hashes reais, senão o oráculo apenas inverte de
 * sinal. Como as contas antigas ainda estão em custo 10, o login faz o upgrade
 * do hash quando a senha confere (ver abaixo) e a base converge para 12.
 */
const DUMMY_HASH = bcrypt.hashSync("senha-que-nunca-sera-usada", BCRYPT_COST);

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    session: {
        strategy: "jwt",
        // O padrão do Auth.js é 30 dias. Uma semana já é bastante para um
        // painel que movimenta dinheiro.
        maxAge: 60 * 60 * 24 * 7,
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.email(), password: z.string().min(8) })
                    .safeParse(credentials);

                if (!parsedCredentials.success) return null;

                const { email, password } = parsedCredentials.data;

                // Freio contra credential stuffing, por IP e por e-mail alvo.
                const ip = getClientIp(await headers());
                const [byIp, byEmail] = await Promise.all([
                    checkRateLimit({ key: `login:ip:${ip}`, limit: 10, windowSeconds: 15 * 60 }),
                    checkRateLimit({ key: `login:email:${email}`, limit: 5, windowSeconds: 15 * 60 }),
                ]);

                if (!byIp.success || !byEmail.success) return null;

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true, name: true, email: true, password: true },
                });

                const passwordsMatch = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

                if (!user || !passwordsMatch) return null;

                // Migra hashes antigos (custo 10) agora que temos a senha em
                // claro e ela já foi conferida.
                if (bcrypt.getRounds(user.password) < BCRYPT_COST) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { password: await bcrypt.hash(password, BCRYPT_COST) },
                    });
                }

                // Só o necessário: devolver o registro inteiro colocava o hash
                // da senha dentro do pipeline de callbacks do token.
                return { id: user.id, name: user.name, email: user.email };
            }
        })
    ],
});
