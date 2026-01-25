// src/components/private/admin/bank-settings-form.tsx
'use client'

import { useActionState } from "react";
import { saveBankSettingsAction } from "@/actions/event-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, CheckCircle2 } from "lucide-react";

export function BankSettingsForm() {
    const [state, action, isPending] = useActionState(saveBankSettingsAction, undefined);

    return (
        <form action={action} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Landmark size={20} />
                </div>
                <h3 className="font-bold text-gray-900">Dados para Saque (PIX)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="pixType">Tipo de Chave</Label>
                    <select 
                        id="pixType" 
                        name="pixType" 
                        className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    >
                        <option value="CPF">CPF</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="PHONE">Telefone (Celular)</option>
                        <option value="EVP">Chave Aleatória</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="pixKey">Chave PIX</Label>
                    <Input 
                        id="pixKey" 
                        name="pixKey" 
                        placeholder="Digite a chave" 
                        required 
                        className="h-12"
                    />
                </div>
            </div>
            
            <p className="text-[10px] text-gray-400">
                ⚠️ Para Telefone, use o formato com +55 (Ex: +5517988230989)
            </p>

            {state?.message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${state.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {state.success && <CheckCircle2 size={16} />}
                    {state.message}
                </div>
            )}

            <Button disabled={isPending} className="w-full bg-gray-900 hover:bg-black h-12">
                {isPending ? "Salvando..." : "Salvar Chave de Saque"}
            </Button>
        </form>
    );
}