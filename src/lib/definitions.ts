import { z } from 'zod';

/**
 * Slugs que colidiriam com rotas da aplicação. Sem isso um usuário registra o
 * slug `admin` e a página pública dele passa a disputar a rota do painel.
 */
const RESERVED_SLUGS = new Set([
    'admin', 'login', 'register', 'api', '_next', 'static',
    'politica-de-privacidade', 'termos-de-uso', 'public', 'assets',
]);

export const SignupFormSchema = z.object({
    name: z.string().min(2, { message: 'Nome deve ser completo' }).max(120),
    email: z.email({ message: 'Email inválido' }).trim(),
    password: z
        .string()
        .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
        .regex(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
        .regex(/[a-z]/, { message: 'Senha deve conter ao menos uma letra minúscula' })
        .regex(/[0-9]/, { message: 'Senha deve conter ao menos um número' })
        .regex(/[\W_]/, { message: 'Senha deve conter ao menos um caractere especial' })
        .trim(),

    eventName: z.string().min(3, { message: 'Nome do evento deve ter no mínimo 3 caracteres' }).max(120),
    eventDate: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', { message: 'Data do evento inválida' }),
    slug: z
        .string()
        .min(3, { message: 'Slug deve ter no mínimo 3 caracteres' })
        .max(60, { message: 'Slug muito longo' })
        .regex(/^[a-z0-9-]+$/, { message: 'Slug pode conter apenas letras minúsculas, números e hífens' })
        .refine((s) => !RESERVED_SLUGS.has(s), { message: 'Este link não está disponível' }),
})

export const LoginFormSchema = z.object({
    email: z.email({ message: 'Email inválido'}),
    // Mesmo mínimo do `authorize` em src/auth.ts — se divergirem, a conta passa
    // no formulário e é rejeitada silenciosamente pelo provider.
    password: z.string().min(8, { message: 'Senha é obrigatória' }),
})

/** Categorias oferecidas pelo <select> do formulário de presente. */
export const GIFT_CATEGORIES = ['Cozinha', 'Viagem', 'Lazer', 'Casa', 'Outros'] as const;

export const CreateGiftSchema = z.object({
    title: z.string().trim().min(3, { message: 'Título muito curto' }).max(120, { message: 'Título muito longo' }),
    // `parseFloat` cru aceitava NaN, negativo e Infinity, que iam direto para o
    // cálculo de taxas no checkout.
    price: z.coerce
        .number({ message: 'Preço inválido' })
        .finite({ message: 'Preço inválido' })
        .positive({ message: 'O preço deve ser maior que zero' })
        .max(1_000_000, { message: 'Preço acima do limite' }),
    category: z.enum(GIFT_CATEGORIES, { message: 'Categoria inválida' }),
})

export const UpdateEventSettingsSchema = z.object({
    introTitle: z.string().trim().max(120).default(''),
    introSubtitle: z.string().trim().max(160).default(''),
    welcomeMessage: z.string().trim().max(2000).default(''),
    // Só link do YouTube: o valor vira embed na página pública.
    videoUrl: z
        .string()
        .trim()
        .max(300)
        .refine(
            (v) => v === '' || /^https:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\//i.test(v),
            { message: 'Informe um link do YouTube' }
        )
        .default(''),
    captions: z.array(z.string().trim().max(200)).default([]),
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
