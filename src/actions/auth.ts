'use server'

import { signIn, signOut, BCRYPT_COST } from "@/auth"
import { FormState, LoginFormSchema, SignupFormSchema } from "@/lib/definitions"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { headers } from "next/headers"

// `authenticate()` foi removida: repassava o FormData cru como objeto de opções
// do signIn, então um campo `redirectTo` enviado pelo cliente era obedecido.
// Nenhum componente a usava — quem faz login é `loginAction`.

export async function signup(prevState: FormState, formData: FormData){
    const validatedFields = SignupFormSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        eventName: formData.get('eventName'),
        slug: formData.get('slug'),
        eventDate: formData.get('eventDate'),
    })

    if(!validatedFields.success){
        return{
            error: validatedFields.error.flatten().fieldErrors,
            message: 'Formulário inválido'
        }
    }

    const { name, email, password, eventName, slug, eventDate } = validatedFields.data

    const ip = getClientIp(await headers())
    const rate = await checkRateLimit({ key: `signup:${ip}`, limit: 5, windowSeconds: 60 * 60 })
    if(!rate.success){
        return { message: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }
    }

    try{
        // Custo 12 em vez de 10: ~4x mais caro para quebrar em offline.
        const hashedPassword = await bcrypt.hash(password, BCRYPT_COST)

        // O slug aparece na URL pública, então dizer que já está em uso não
        // revela nada que não seja visível.
        const existingSlug = await prisma.event.findUnique({
            where: { slug },
            select: { id: true },
        })
        if(existingSlug) return { message: 'Este link personalizado já está em uso.'}

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        })

        // Não confirmar que o e-mail já tem conta: isso transformava o cadastro
        // num verificador de quem está na base. A mensagem é a mesma dos dois
        // lados e quem já tem conta simplesmente vai para o login.
        if(existingUser){
            return { message: 'Se este e-mail ainda não estiver cadastrado, a conta será criada. Caso já tenha conta, faça login.' }
        }

        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                },
            })

            await tx.event.create({
                data:{
                    title: eventName,
                    slug: slug,
                    coupleName: name,
                    eventDate: new Date(eventDate),
                    userId: user.id,
                }
            })
        })
    } catch (error){
        // Sem despejar o erro inteiro: ele carrega os parâmetros da query,
        // incluindo e-mail e hash de senha.
        console.error("Erro no cadastro:", error instanceof Error ? error.message : 'erro desconhecido')
        return{
            message: 'Não foi possível criar a conta. Tente novamente.'
        }
    }

    try{
        await signIn('credentials', {email, password, redirectTo: '/admin'})
    } catch (error){
        if(error instanceof AuthError){
            return{ message: "Conta Criada, mas erro ao logar automaticamente"}
        }
        throw error
    }        
}

export async function loginAction(
    prevState: FormState | undefined,
    formData: FormData,
){
    const data = Object.fromEntries(formData.entries())
    const validatedFields = LoginFormSchema.safeParse(data)

    if(!validatedFields.success){
        return {
            error: validatedFields.error.flatten().fieldErrors,
            message: 'Campos inválidos'
        }
    }
    
    const { email, password } = validatedFields.data

    try{
        await signIn('credentials', {email, password, redirectTo: '/admin'})
    } catch (error){
        if(error instanceof AuthError){
            switch(error.type){
                case 'CredentialsSignin':
                    return { message: 'Credenciais inválidas'}
                default:
                    return { message: 'Erro desconhecido'}
            }
        }
        throw error
    }

}

export async function logoutAction(){
    await signOut({redirectTo: '/'})
}