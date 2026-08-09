"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Heart, Link2, ShieldCheck, AlertTriangle } from "lucide-react";
import { updateWeddingDetails, updateEventSlug } from "@/actions/event-actions";
import { updateProfile, changePassword } from "@/actions/account-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface AccountSettingsData {
    coupleName: string;
    title: string;
    /** ISO — o `<input type="date">` usa só a parte da data. */
    eventDate: string;
    slug: string;
    userName: string;
    userEmail: string;
}

type ActionFn = (formData: FormData) => Promise<{ success: boolean; message?: string }>;

export function AccountSettingsForm({ data }: { data: AccountSettingsData }) {
    return (
        <div className="space-y-6">
            <WeddingCard data={data} />
            <SlugCard slug={data.slug} />
            <ProfileCard name={data.userName} email={data.userEmail} />
            <PasswordCard />
        </div>
    );
}

/** Um `<form action>` por card: cada bloco salva sozinho, sem arrastar o resto. */
function SectionForm({
    action,
    successMessage,
    submitLabel,
    children,
    resetOnSuccess = false,
    destructive = false,
}: {
    action: ActionFn;
    successMessage: string;
    submitLabel: string;
    children: React.ReactNode;
    resetOnSuccess?: boolean;
    destructive?: boolean;
}) {
    const [isSaving, setIsSaving] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsSaving(true);
        try {
            const result = await action(formData);
            if (result.success) {
                toast.success(successMessage);
                if (resetOnSuccess) {
                    // Campos de senha não podem ficar preenchidos depois de salvar.
                    document.querySelectorAll<HTMLFormElement>("form[data-reset]").forEach((f) => f.reset());
                }
            } else {
                toast.error(result.message ?? "Não foi possível salvar.");
            }
        } catch {
            toast.error("Erro inesperado. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form action={handleSubmit} data-reset={resetOnSuccess ? "" : undefined} className="space-y-4">
            {children}
            <Button
                type="submit"
                disabled={isSaving}
                className={destructive ? "bg-amber-600 hover:bg-amber-700" : "bg-rose-600 hover:bg-rose-700"}
            >
                {isSaving ? (
                    <>
                        <Loader2 className="animate-spin" size={16} /> Salvando...
                    </>
                ) : (
                    submitLabel
                )}
            </Button>
        </form>
    );
}

function WeddingCard({ data }: { data: AccountSettingsData }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Heart size={20} className="text-rose-600" />
                    Dados do casamento
                </CardTitle>
                <CardDescription>
                    O nome do casal e a data aparecem no convite e na página pública.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SectionForm
                    action={updateWeddingDetails}
                    successMessage="Dados do casamento atualizados!"
                    submitLabel="Salvar dados"
                >
                    <div>
                        <Label htmlFor="coupleName">Nome do casal</Label>
                        <Input
                            id="coupleName"
                            name="coupleName"
                            required
                            defaultValue={data.coupleName}
                            placeholder="Joana & Junior"
                            maxLength={120}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Separe com <strong>&amp;</strong> ou <strong>e</strong> para o convite
                            escrever um nome em cada linha.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="eventDate">Data do casamento</Label>
                            <Input
                                id="eventDate"
                                name="eventDate"
                                type="date"
                                required
                                defaultValue={data.eventDate.slice(0, 10)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                O horário fica na aba Convite.
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="title">Título do evento</Label>
                            <Input
                                id="title"
                                name="title"
                                required
                                defaultValue={data.title}
                                placeholder="Nosso Casamento"
                                maxLength={120}
                            />
                            <p className="text-xs text-gray-500 mt-1">Uso interno, para você se organizar.</p>
                        </div>
                    </div>
                </SectionForm>
            </CardContent>
        </Card>
    );
}

function SlugCard({ slug }: { slug: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Link2 size={20} className="text-rose-600" />
                    Endereço da página
                </CardTitle>
                <CardDescription>
                    É o link que você manda para os convidados.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2.5 text-sm text-amber-900">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p>
                        Se você já enviou o convite para alguém, <strong>mudar aqui quebra o
                        link antigo</strong> — quem tentar abrir vai receber página não
                        encontrada. Troque só se ainda não distribuiu.
                    </p>
                </div>

                <SectionForm
                    action={updateEventSlug}
                    successMessage="Endereço atualizado! Use o link novo daqui em diante."
                    submitLabel="Trocar endereço"
                    destructive
                >
                    <div>
                        <Label htmlFor="slug">Endereço</Label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-400 shrink-0">/</span>
                            <Input
                                id="slug"
                                name="slug"
                                required
                                defaultValue={slug}
                                placeholder="joana-e-junior"
                                maxLength={60}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Letras minúsculas, números e hífens. Hoje: <code>/{slug}</code>
                        </p>
                    </div>
                </SectionForm>
            </CardContent>
        </Card>
    );
}

function ProfileCard({ name, email }: { name: string; email: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck size={20} className="text-rose-600" />
                    Dados de acesso
                </CardTitle>
                <CardDescription>
                    O e-mail é o que você usa para entrar no painel.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SectionForm
                    action={updateProfile}
                    successMessage="Dados de acesso atualizados!"
                    submitLabel="Salvar acesso"
                    resetOnSuccess
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Seu nome</Label>
                            <Input id="name" name="name" required defaultValue={name} maxLength={120} />
                        </div>
                        <div>
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                defaultValue={email}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="profilePassword">Sua senha atual</Label>
                        <Input
                            id="profilePassword"
                            name="currentPassword"
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Pedimos a senha porque mudar o e-mail muda como se entra na conta.
                        </p>
                    </div>
                </SectionForm>
            </CardContent>
        </Card>
    );
}

function PasswordCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Trocar senha</CardTitle>
                <CardDescription>
                    Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SectionForm
                    action={changePassword}
                    successMessage="Senha alterada!"
                    submitLabel="Trocar senha"
                    resetOnSuccess
                >
                    <div>
                        <Label htmlFor="currentPassword">Senha atual</Label>
                        <Input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="newPassword">Nova senha</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <Label htmlFor="confirmPassword">Repita a nova senha</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </SectionForm>
            </CardContent>
        </Card>
    );
}
