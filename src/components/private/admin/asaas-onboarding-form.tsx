"use client";

import { useActionState } from "react";
import { setupAsaasAction } from "@/actions/event-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, MapPin } from "lucide-react";

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
          <strong>Configuração de Recebimento:</strong> Como plataforma White
          Label, os presentes pagos pelos convidados caem direto na sua conta.
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
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobilePhone">Celular (com DDD)</Label>
          <Input
            id="mobilePhone"
            name="mobilePhone"
            placeholder="11999999999"
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
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">CEP</Label>
          <Input
            id="postalCode"
            name="postalCode"
            placeholder="00000-000"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">Data de Nascimento</Label>
          <Input id="birthDate" name="birthDate" type="date" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="asaasEmail">E-mail para Recebimento</Label>
          <Input
            id="asaasEmail"
            name="asaasEmail"
            type="email"
            placeholder="email@financeiro.com"
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
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressNumber">Número</Label>
            <Input id="addressNumber" name="addressNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">Bairro</Label>
            <Input id="province" name="province" required />
          </div>
        </div>
      </div>

      {state?.message && (
        <p
          className={`text-sm font-medium ${state.success ? "text-green-600" : "text-red-600"}`}
        >
          {state.message}
        </p>
      )}

      <Button
        disabled={isPending}
        type="submit"
        className="w-full bg-rose-600 hover:bg-rose-700 h-12"
      >
        {isPending ? "Configurando conta..." : "Ativar Recebimento e Começar"}
      </Button>
    </form>
  );
}
