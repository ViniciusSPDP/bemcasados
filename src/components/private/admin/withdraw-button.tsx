'use client'

import { useState } from "react";
import { requestWithdrawalAction } from "@/actions/event-actions";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Loader2 } from "lucide-react";

interface WithdrawButtonProps {
    balance: number;
    isApproved: boolean;
}

export function WithdrawButton({ balance, isApproved }: WithdrawButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleWithdraw = async () => {
        if (!isApproved) {
            alert("Sua conta ainda não foi aprovada pelo Asaas.");
            return;
        }

        if (balance < 5) {
            alert("Saldo mínimo para saque é de R$ 5,00 devido às taxas.");
            return;
        }

        const confirmWithdraw = confirm(`Deseja sacar seu saldo disponível de R$ ${balance.toFixed(2)}?`);
        if (!confirmWithdraw) return;

        setLoading(true);
        const res = await requestWithdrawalAction();
        setLoading(false);

        if (res.success) {
            alert(res.message);
        } else {
            alert(res.message);
        }
    };

    return (
        <Button 
            onClick={handleWithdraw}
            disabled={loading || balance <= 0 || !isApproved}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
            {loading ? <Loader2 className="animate-spin" /> : <ArrowUpRight size={18} />}
            Solicitar Saque (PIX)
        </Button>
    );
}