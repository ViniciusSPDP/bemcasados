"use client";

import { useState } from "react";
import { checkAndVerifyEvent } from "@/actions/event-actions";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface VerifyAccountButtonProps {
  eventId: string;
  asaasApiKey: string;
}

export function VerifyAccountButton({ eventId, asaasApiKey }: VerifyAccountButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    setLoading(true);
    try {
      const result = await checkAndVerifyEvent(eventId, asaasApiKey);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button 
      onClick={handleVerify} 
      disabled={loading}
      variant="outline"
      className="w-full mt-4 border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl py-6"
    >
      {loading ? (
        <><Loader2 className="animate-spin mr-2" size={18} /> Verificando no Asaas...</>
      ) : (
        <><RefreshCw size={18} className="mr-2" /> Verificar Aprovação Agora</>
      )}
    </Button>
  );
}