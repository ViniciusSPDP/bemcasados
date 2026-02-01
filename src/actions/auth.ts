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
    try {
        await signIn('credentials', formData)
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciais inválidas'
                default:
                    return 'Erro desconhecido'
            }
        }
        throw error
    }
}

export async function signup(prevState: FormState, formData: FormData) {
    // 1. Captura o phone do FormData
    const rawData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string, // <--- NOVO
        eventName: formData.get('eventName') as string,
        slug: formData.get('slug') as string,
        eventDate: formData.get('eventDate') as string,
    }

    // 2. Valida incluindo o phone
    const validatedFields = SignupFormSchema.safeParse({
        ...rawData,
        password: formData.get('password'),
    })

    if (!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors,
            message: 'Formulário inválido',
            fields: rawData 
        }
    }

    // 3. Desestrutura o phone dos dados validados
    const { name, email, phone, password, eventName, slug, eventDate } = validatedFields.data

    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })
        if (existingUser) return { message: 'Usuário já existe', fields: rawData }

        const existingSlug = await prisma.event.findUnique({
            where: { slug },
        })
        if (existingSlug) return { message: 'Este link personalizado já está em uso.', fields: rawData }

        await prisma.$transaction(async (tx) => {
            // 4. Salva o phone no banco de dados
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    phone, // <--- SALVANDO NO BANCO
                    password: hashedPassword,
                },
            })

            await tx.event.create({
                data: {
                    title: eventName,
                    slug: slug,
                    coupleName: name,
                    eventDate: new Date(eventDate),
                    userId: user.id,
                }
            })
        })
    } catch (error) {
        console.error("Erro no cadastro: ", error)
        return {
            message: 'Erro no cadastro bd. Falha ao criar a conta',
            fields: rawData
        }
    }

    try {
        await signIn('credentials', { email, password, redirectTo: '/admin' })
    } catch (error) {
        if (error instanceof AuthError) {
            return { message: "Conta Criada, mas erro ao logar automaticamente", fields: rawData }
        }
        throw error
    }        
}

export async function loginAction(
    prevState: FormState | undefined,
    formData: FormData,
) {
    const data = Object.fromEntries(formData.entries())
    const validatedFields = LoginFormSchema.safeParse(data)

    if (!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors,
            message: 'Campos inválidos',
            fields: { email: data.email as string } 
        }
    }
    
    const { email, password } = validatedFields.data

    try {
        await signIn('credentials', { email, password, redirectTo: '/admin' })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return { message: 'Credenciais inválidas', fields: { email } }
                default:
                    return { message: 'Erro desconhecido', fields: { email } }
            }
        }
        throw error
    }
}

export async function logoutAction() {
    await signOut({ redirectTo: '/' })
}