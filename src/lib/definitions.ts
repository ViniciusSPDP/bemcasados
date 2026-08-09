import { z } from 'zod';
import { isAllowedLinkHost, isAllowedImageHost } from '@/lib/ml-link';
import { onlyDigits, isValidBrazilianPhone } from '@/lib/phone';

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

/* ------------------------------------------------------------------------- */
/* Dados do casamento e da conta                                              */
/* ------------------------------------------------------------------------- */

/** Regra única de senha, para cadastro e troca não divergirem. */
const PasswordRules = z
    .string()
    .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
    .regex(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
    .regex(/[a-z]/, { message: 'Senha deve conter ao menos uma letra minúscula' })
    .regex(/[0-9]/, { message: 'Senha deve conter ao menos um número' })
    .regex(/[\W_]/, { message: 'Senha deve conter ao menos um caractere especial' })
    .trim()

/** O slug é validado igual ao cadastro: mesma regra, mesma lista de reservados. */
const SlugRules = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: 'O endereço deve ter no mínimo 3 caracteres' })
    .max(60, { message: 'Endereço muito longo' })
    .regex(/^[a-z0-9-]+$/, { message: 'Use apenas letras minúsculas, números e hífens' })
    .refine((s) => !RESERVED_SLUGS.has(s), { message: 'Este endereço não está disponível' })

export const UpdateWeddingSchema = z.object({
    coupleName: z.string().trim().min(2, { message: 'Informe o nome do casal' }).max(120),
    title: z.string().trim().min(3, { message: 'Título muito curto' }).max(120),
    // `<input type="date">` manda "2026-05-08". Guardar como meia-noite UTC
    // mantém a leitura do convite (que lê em UTC) no dia certo em qualquer fuso.
    eventDate: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida' })
        .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), {
            message: 'Data inválida',
        })
        .transform((v) => new Date(`${v}T00:00:00.000Z`)),
})

export const UpdateSlugSchema = z.object({ slug: SlugRules })

export const UpdateProfileSchema = z.object({
    name: z.string().trim().min(2, { message: 'Nome deve ser completo' }).max(120),
    email: z.email({ message: 'E-mail inválido' }).trim().toLowerCase(),
    // Trocar e-mail muda como se entra na conta: exigir a senha impede que uma
    // sessão esquecida aberta num computador vire uma tomada de conta.
    currentPassword: z.string().min(1, { message: 'Informe sua senha atual' }),
})

export const ChangePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, { message: 'Informe sua senha atual' }),
        newPassword: PasswordRules,
        confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        message: 'A confirmação não confere com a nova senha',
        path: ['confirmPassword'],
    })
    .refine((d) => d.newPassword !== d.currentPassword, {
        message: 'A nova senha precisa ser diferente da atual',
        path: ['newPassword'],
    })

/* ------------------------------------------------------------------------- */
/* Convite virtual                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Serviços de mapa aceitos no botão "Localização" do convite.
 *
 * Não é anti-SSRF — nada aqui é buscado pelo servidor. É contra abuso do
 * convite: sem allowlist, o link viraria um redirecionador para qualquer lugar,
 * saindo de um domínio em que o convidado confia.
 */
const MAP_HOSTS = [
    'google.com',
    'goo.gl',
    'maps.app.goo.gl',
    'openstreetmap.org',
    'waze.com',
    'apple.com',
] as const;

function isAllowedMapHost(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/\.$/, '');
    // Igualdade ou subdomínio de verdade: `endsWith` cru deixaria passar
    // `notgoogle.com`, e `includes` deixaria passar `google.com.evil.io`.
    return MAP_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

export const CeremonyMapsUrlSchema = z
    .string()
    .trim()
    .max(600, { message: 'Link muito longo' })
    .refine((v) => v === '' || isAllowedHttpsUrl(v, isAllowedMapHost), {
        message: 'Informe um link do Google Maps, Waze ou OpenStreetMap',
    })
    .default('')

/** "20:30". O `eventDate` guarda só a data — a hora é digitada à parte. */
export const CeremonyTimeSchema = z
    .string()
    .trim()
    .refine((v) => v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), {
        message: 'Horário inválido. Use o formato 20:30',
    })
    .default('')

export const UpdateInviteSchema = z.object({
    monogram: z.string().trim().max(20, { message: 'Monograma muito longo' }).default(''),
    inviteVerse: z.string().trim().max(400, { message: 'Frase muito longa' }).default(''),
    ceremonyTime: CeremonyTimeSchema,
    ceremonyVenue: z.string().trim().max(160, { message: 'Nome do local muito longo' }).default(''),
    ceremonyAddress: z.string().trim().max(300, { message: 'Endereço muito longo' }).default(''),
    ceremonyMapsUrl: CeremonyMapsUrlSchema,
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

/* ------------------------------------------------------------------------- */
/* Vitrine do Mercado Livre                                                   */
/* ------------------------------------------------------------------------- */

/** Teto de itens por evento — segura o tamanho do payload da página pública. */
export const MAX_EXTERNAL_GIFTS = 60;

/**
 * Teto por importação de planilha.
 *
 * Fica aqui, e não na Server Action, porque o aviso da tela precisa do mesmo
 * número: um arquivo com `"use server"` só pode exportar função assíncrona, e
 * repetir o valor no componente deixaria o aviso mentir no dia em que a regra
 * mudasse. Cada linha consulta o Mercado Livre, e um lote grande faz eles
 * bloquearem por suspeita de robô.
 */
export const MAX_IMPORT_ROWS = 15;

/** `true` se a string é uma URL https de um host da allowlist. */
function isAllowedHttpsUrl(value: string, isAllowedHost: (hostname: string) => boolean): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && isAllowedHost(url.hostname);
    } catch {
        return false;
    }
}

/**
 * O link que o casal cola. É validado aqui, **antes** de qualquer requisição:
 * um endereço fora da allowlist nunca chega a virar um socket aberto pelo
 * servidor. Ver `src/lib/ml-link.ts` para o porquê.
 */
export const ExternalGiftUrlSchema = z
    .string()
    .trim()
    .min(1, { message: 'Cole o link do produto' })
    .max(500, { message: 'Link muito longo' })
    .refine((v) => isAllowedHttpsUrl(v, isAllowedLinkHost), {
        message: 'Informe um link do Mercado Livre (meli.la ou mercadolivre.com.br)',
    });

/** Caminho opcional: a URL da foto no CDN do ML, para baixarmos direto. */
export const ExternalImageUrlSchema = z
    .string()
    .trim()
    .max(500, { message: 'Link muito longo' })
    .refine((v) => v === '' || isAllowedHttpsUrl(v, isAllowedImageHost), {
        message: 'A URL da imagem precisa ser do Mercado Livre (http2.mlstatic.com)',
    })
    .default('');

/**
 * Sem campo de preço de propósito: quem cobra é o Mercado Livre, e o valor de lá
 * varia. Um número congelado aqui mostraria ao convidado um preço que não é o
 * que ele vai pagar.
 */
export const CreateExternalGiftSchema = z.object({
    shortUrl: ExternalGiftUrlSchema,
    title: z.string().trim().min(3, { message: 'Título muito curto' }).max(140, { message: 'Título muito longo' }),
    description: z.string().trim().max(1000, { message: 'Descrição muito longa' }).default(''),
    imageSourceUrl: ExternalImageUrlSchema,
})

/** Dados do convidado que reserva. Sem CPF, sem e-mail, sem valor. */
export const ReserveExternalGiftSchema = z.object({
    giftId: z.uuid({ message: 'Presente inválido' }),
    name: z.string().trim().min(3, { message: 'Informe seu nome' }).max(120, { message: 'Nome muito longo' }),
    // Guardamos só dígitos: o mesmo número digitado de cinco jeitos viraria
    // cinco contatos diferentes para o casal. O painel formata na exibição.
    phone: z
        .string()
        .transform(onlyDigits)
        .refine(isValidBrazilianPhone, { message: 'Telefone inválido. Informe DDD + número.' }),
    message: z.string().trim().max(500, { message: 'Mensagem muito longa' }).default(''),
})

/* ------------------------------------------------------------------------- */
/* Confirmação de presença                                                    */
/* ------------------------------------------------------------------------- */

/**
 * Teto de acompanhantes por confirmação.
 *
 * Vive aqui porque a tela precisa do mesmo número para desabilitar o botão de
 * somar: um arquivo com `"use server"` só exporta função assíncrona, e repetir o
 * valor no componente deixaria o aviso mentir no dia em que a regra mudasse.
 */
export const MAX_COMPANIONS = 5;

/**
 * O endereço público do casamento, como ele chega do convite.
 *
 * A ação da confirmação é anônima e não tem sessão de onde tirar o evento, então
 * o cliente informa **o slug** — que é público — e o `id` sai do banco. É a
 * forma disponível da regra "nunca grave um `eventId` que veio do cliente".
 */
const PublicSlugSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: 'Convite inválido' })
    .max(60, { message: 'Convite inválido' })
    .regex(/^[a-z0-9-]+$/, { message: 'Convite inválido' })

/**
 * Os campos da confirmação em si.
 *
 * Ficam separados porque **duas** entradas os validam: o convidado, que
 * identifica o evento pelo `slug`, e o casal corrigindo pelo painel, que
 * identifica a linha pelo `id`. Escrever o mesmo objeto duas vezes é o caminho
 * curto para as duas divergirem — e a que ficasse mais frouxa viraria o buraco.
 */
const RsvpFields = {
    name: z.string().trim().min(3, { message: 'Informe seu nome' }).max(120, { message: 'Nome muito longo' }),
    // Mesma normalização da reserva: guardamos só dígitos, senão o mesmo
    // número entra de cinco formas e o casal vê cinco pessoas diferentes.
    // Aqui isso pesa mais, porque é o telefone que identifica a resposta na
    // chave única — sem normalizar, "(11) 98765-4321" e "11987654321"
    // viveriam como duas confirmações da mesma pessoa.
    phone: z
        .string()
        .transform(onlyDigits)
        .refine(isValidBrazilianPhone, { message: 'Telefone inválido. Informe DDD + número.' }),
    status: z.enum(['SIM', 'NAO'], { message: 'Diga se você vai ou não ao casamento' }),
    message: z.string().trim().max(500, { message: 'Recado muito longo' }).default(''),
    // Quem preenche clica em "somar acompanhante" e pode deixar o campo em
    // branco. Descartar o vazio ANTES do teto evita recusar uma confirmação
    // legítima por causa de uma linha que a pessoa abriu e não usou.
    companions: z.preprocess(
        (value) =>
            Array.isArray(value)
                ? value.map((v) => String(v).trim()).filter((v) => v !== '')
                : [],
        z
            .array(
                z
                    .string()
                    .min(2, { message: 'Nome de acompanhante muito curto' })
                    .max(120, { message: 'Nome de acompanhante muito longo' })
            )
            .max(MAX_COMPANIONS, {
                message: `No máximo ${MAX_COMPANIONS} acompanhantes por confirmação`,
            })
    ),
} as const

/**
 * Quem não vai não leva ninguém.
 *
 * Decidido no servidor e não no formulário: o cliente esconde os campos, mas
 * quem manda o POST à mão não esconde nada. Vale para as duas entradas — o casal
 * também marca "não vai" numa resposta que tinha acompanhante.
 */
function clearCompanionsWhenDeclined<T extends { status: 'SIM' | 'NAO'; companions: string[] }>(
    data: T
): T {
    return { ...data, companions: data.status === 'NAO' ? [] : data.companions }
}

/**
 * Confirmação de presença. Sem CPF, sem e-mail, sem valor — não há cobrança.
 *
 * Quem não vai também é registrado: para o casal, "respondeu que não" e "não
 * respondeu" são situações diferentes, e só a primeira dispensa a cobrança.
 */
export const RsvpSchema = z
    .object({ slug: PublicSlugSchema, ...RsvpFields })
    .transform(clearCompanionsWhenDeclined)

/**
 * Correção de uma confirmação pelo painel do casal.
 *
 * Existe porque apagar não resolve os dois casos mais comuns: nome digitado
 * errado e acompanhante a mais ou a menos. Só o convidado não convidado é caso
 * de exclusão.
 *
 * Mesmas regras de conteúdo da versão pública — o que muda é só a identificação
 * da linha, que aqui é o `id`, cruzado com o evento da sessão na action.
 */
export const UpdateRsvpSchema = z
    .object({ id: z.uuid({ message: 'Confirmação inválida' }), ...RsvpFields })
    .transform(clearCompanionsWhenDeclined)

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
