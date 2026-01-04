'use server'

import { signIn, signOut } from "@/auth"
import { FormState, LoginFormSchema, SignupFormSchema } from "@/lib/definitions"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"


export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try{
        await signIn('credentials', formData)
    }catch(error){
        if(error instanceof AuthError){
            switch(error.type){
                case 'CredentialsSignin':
                    return 'Credenciais inválidas'
                default:
                    return 'Erro desconhecido'
            }
        }
        throw error
    }
}

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

    try{
        const hashedPassword = await bcrypt.hash(password, 10)
        
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })
        if(existingUser) return { message: 'Usuário já existe'}

        const existingSlug = await prisma.event.findUnique({
            where: { slug },
        })
        if(existingSlug) return { message: 'Este link personalizado já está em uso.'}

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
        console.error("Erro no cadastro: ", error)
        return{
            message: 'Erro no cadastro bd. Falha ao criar a conta'
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