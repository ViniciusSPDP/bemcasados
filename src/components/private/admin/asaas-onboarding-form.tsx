"use client";

import { useActionState } from "react";
import { setupAsaasAction } from "@/actions/event-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, MapPin, Loader2 } from "lucide-react";

export function AsaasOnboardingForm() {
  const [state, action, isPending] = useActionState(
    setupAsaasAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
        <CreditCard className="text-blue-600 shrink-0 mt-1" size={20} />
        <p className="text-sm text-blue-800">
          <strong>Configuração de Recebimento:</strong> Os presentes pagos pelos convidados caem direto na sua conta.
          Precisamos desses dados para criar sua carteira digital segura.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
          <Input
            id="cpfCnpj"
            name="cpfCnpj"
            placeholder="000.000.000-00"
            defaultValue={state?.fields?.cpfCnpj}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobilePhone">Celular (com DDD)</Label>
          <Input
            id="mobilePhone"
            name="mobilePhone"
            placeholder="11999999999"
            defaultValue={state?.fields?.mobilePhone}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="incomeValue">Faturamento Mensal Estimado</Label>
          <Input
            id="incomeValue"
            name="incomeValue"
            type="number"
            placeholder="5000"
            defaultValue={state?.fields?.incomeValue}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">CEP</Label>
          <Input
            id="postalCode"
            name="postalCode"
            placeholder="00000-000"
            defaultValue={state?.fields?.postalCode}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">Data de Nascimento</Label>
          <Input 
            id="birthDate" 
            name="birthDate" 
            type="date" 
            defaultValue={state?.fields?.birthDate}
            required 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="asaasEmail">E-mail para Recebimento</Label>
          <Input
            id="asaasEmail"
            name="asaasEmail"
            type="email"
            placeholder="email@financeiro.com"
            defaultValue={state?.fields?.asaasEmail}
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
          <MapPin size={18} /> Endereço Residencial/Comercial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address">Logradouro</Label>
            <Input
              id="address"
              name="address"
              placeholder="Rua, Av..."
              defaultValue={state?.fields?.address}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressNumber">Número</Label>
            <Input 
              id="addressNumber" 
              name="addressNumber" 
              defaultValue={state?.fields?.addressNumber}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">Bairro</Label>
            <Input 
              id="province" 
              name="province" 
              defaultValue={state?.fields?.province}
              required 
            />
          </div>
        </div>
      </div>

      {state?.message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${state.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {state.message}
        </div>
      )}

      <Button
        disabled={isPending}
        type="submit"
        className="w-full bg-rose-600 hover:bg-rose-700 h-12 text-white font-bold transition-all active:scale-[0.98]"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={20} /> Configurando conta...
          </span>
        ) : "Ativar Recebimento e Começar"}
      </Button>
    </form>
  );
}