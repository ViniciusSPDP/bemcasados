import NextAuth from "next-auth";
import { authConfig } from "./auth.config";


const { auth } = NextAuth(authConfig)
export default auth


export const config = {
    /**
     * Só as rotas que realmente dependem de decisão de sessão.
     *
     * Antes o matcher cobria o site inteiro, o que trazia dois problemas: o
     * Auth.js anexava `Set-Cookie` até em páginas estáticas — respostas que o
     * Next marca com `s-maxage` longo, combinação ruim se uma CDN resolver
     * cachear — e qualquer falha de bypass de middleware valia para tudo.
     *
     * A proteção real do /admin não está aqui e sim no `verifySession()` que a
     * própria página executa (src/lib/dal.ts). Este proxy é a camada de
     * conveniência que evita renderizar a página só para redirecionar depois.
     */
    matcher: ['/admin/:path*', '/login', '/register'],
}