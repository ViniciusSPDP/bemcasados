import { z } from 'zod';

export const SignupFormSchema = z.object({
    name: z.string().min(2, { message: 'Nome deve ser completo' }),
    email: z.email({ message: 'Email inválido' }).trim(),
    password: z
        .string()
        .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
        .regex(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
        .regex(/[a-z]/, { message: 'Senha deve conter ao menos uma letra minúscula' })
        .regex(/[0-9]/, { message: 'Senha deve conter ao menos um número' })
        .regex(/[\W_]/, { message: 'Senha deve conter ao menos um caractere especial' })
        .trim(),

    eventName: z.string().min(3, { message: 'Nome do evento deve ter no mínimo 3 caracteres' }),
    eventDate: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', { message: 'Data do evento inválida' }),
    slug: z
        .string()
        .min(3, { message: 'Slug deve ter no mínimo 3 caracteres' })
        .regex(/^[a-z0-9-]+$/, { message: 'Slug pode conter apenas letras minúsculas, números e hífens' }),
})

export const LoginFormSchema = z.object({
    email: z.email({ message: 'Email inválido'}),
    password: z.string().min(1, { message: 'Senha é obrigatória' }),
})

export type FormState = |
{
    error?: {
        name?: string[];
        email?: string[];
        password?: string[];
        eventName?: string[];
        slug?: string[];
        eventDate?: string[];
    }
    message?: string;

} | undefined
