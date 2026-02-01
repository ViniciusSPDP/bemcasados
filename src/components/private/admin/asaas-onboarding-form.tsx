// src/components/private/admin/asaas-onboarding-form.tsx
"use client";

import { useActionState } from "react";
import { connectAsaasAccountAction } from "@/actions/event-actions"; // Nova action
import { Loader2, Key, Wallet, AlertTriangle } from "lucide-react";

const initialState = {
  success: false,
  message: "",
};

export function AsaasOnboardingForm() {
  const [state, formAction, isPending] = useActionState(connectAsaasAccountAction, initialState);

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start text-amber-800">
        <AlertTriangle className="shrink-0 mt-0.5" size={18} />
        <div className="text-sm">
          <p className="font-bold">Fila de Espera Ativa</p>
          <p>No momento, estamos aceitando apenas usuários que já possuem conta aprovada no Asaas.</p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Asaas API Key</label>
            <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    name="apiKey" 
                    type="password"
                    required
                    placeholder="$aact_..." 
                    className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-mono"
                />
            </div>
            <p className="text-[10px] text-gray-400 ml-1">Disponível em: Minha Conta &gt; Integrações</p>
        </div>

        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Wallet ID (ID da Carteira)</label>
            <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    name="walletId" 
                    type="text"
                    required
                    placeholder="Ex: 60f..." 
                    className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-mono"
                />
            </div>
        </div>

        {state?.message && (
          <p className={`text-sm font-medium text-center ${state.success ? "text-emerald-600" : "text-red-500"}`}>
            {state.message}
          </p>
        )}

        <button
          disabled={isPending}
          className="w-full h-14 bg-gray-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="animate-spin" /> : "Conectar Conta Asaas"}
        </button>
      </form>
      
      <div className="text-center pt-4">
          <p className="text-xs text-gray-400">Não tem conta no Asaas?</p>
          <a href="https://www.asaas.com/" target="_blank" className="text-rose-600 font-bold text-xs hover:underline">Criar conta gratuitamente</a>
      </div>
    </div>
  );
}