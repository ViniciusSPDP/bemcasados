// src/lib/definitions.ts
import { z } from 'zod'

export const SignupFormSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Insira um endereço de email válido.' }),
  phone: z.string().min(10, { message: 'Insira um telefone válido com DDD.' }), // <--- ADICIONADO
  password: z.string().min(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
    .regex(/[a-zA-Z]/, { message: 'A senha deve conter pelo menos uma letra.' })
    .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número.' }),
  eventName: z.string().min(3, { message: 'Nome do evento muito curto.' }),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, { message: 'O link deve conter apenas letras minúsculas, números e hífens.' }),
  eventDate: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', { message: 'Data inválida.' }),
})

export const LoginFormSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type FormState =
  | {
      error?: {
        name?: string[]
        email?: string[]
        phone?: string[] // <--- ADICIONADO
        password?: string[]
        eventName?: string[]
        slug?: string[]
        eventDate?: string[]
      }
      message?: string
      fields?: { // <--- ADICIONADO PARA MANTER OS DADOS NO INPUT
          name?: string;
          email?: string;
          phone?: string;
          eventName?: string;
          slug?: string;
          eventDate?: string;
      }
    }
  | undefined