import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import 'server-only'
import { prisma } from '@/lib/prisma'



export const verifySession = cache(async () => {
    const session = await auth()

    if(!session?.user){
        redirect ('/login')
    }

    return { isAuth: true, userId: session.user.id}
})

export const getUserEvent = cache(async () =>{
    const session = await verifySession();

    const event = await prisma.event.findFirst({
        where: {
            userId: session.userId,
        },
        select:{
            id: true,
            title: true,
            slug: true,
            coupleName: true,
        }
    })
    return event;
})