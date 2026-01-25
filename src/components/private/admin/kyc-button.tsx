'use client'

import { Button } from "@/components/ui/button";
import { getVerificationLinkAction } from "@/actions/event-actions";
import { useState } from "react";

export function KYCButton() {
    const [isPending, setIsPending] = useState(false);

    const handleVerify = async () => {
        setIsPending(true);
        try {
            const res = await getVerificationLinkAction();
            if (res.success && res.url) {
                window.open(res.url, '_blank');
            } else {
                alert(res.message || "Erro ao gerar link.");
            }
        } catch {
            alert("Erro ao processar solicitação.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Button 
            size="lg" 
            className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg font-bold"
            onClick={handleVerify}
            disabled={isPending}
        >
            {isPending ? "Gerando link..." : "Iniciar Verificação Agora"}
        </Button>
    );
}