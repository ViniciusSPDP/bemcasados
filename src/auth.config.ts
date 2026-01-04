import { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
        newUser: '/register',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAdmin = nextUrl.pathname.startsWith('/admin');

            if (isOnAdmin) {
                if(isLoggedIn) return true;
                return false;
            }

            if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
                return Response.redirect(new URL('/admin', nextUrl));
            }
            return true;
        },
        session({ session, token }) {
            if(session.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
    }, 
    providers: [],
} satisfies NextAuthConfig;