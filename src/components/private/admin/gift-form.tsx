"use client";

import { useRef, useState, ChangeEvent } from "react";
import { createGift } from "@/actions/gift-actions";
import { checkAndVerifyEvent } from "@/actions/event-actions"; // Importe sua nova action
import { 
  PlusCircle, 
  Loader2, 
  ImagePlus, 
  X, 
  Tag, 
  DollarSign, 
  Layers, 
  AlertCircle,
  Lock,
  Check,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GiftFormProps {
  isApproved: boolean;
  eventId: string;
  asaasApiKey: string;
}

export function GiftForm({ isApproved, eventId, asaasApiKey }: GiftFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // --- LÓGICA DE VERIFICAÇÃO MANUAL ---
  async function handleVerifyAccount() {
    setIsValidating(true);
    try {
      const result = await checkAndVerifyEvent(eventId, asaasApiKey);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch  {
      toast.error("Ocorreu um erro ao verificar sua conta.");
    } finally {
      setIsValidating(false);
    }
  }

  // --- LÓGICA DE IMAGE PREVIEW ---
  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande! Máximo 5MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  // --- SUBMIT DO PRESENTE ---
  async function handleOnSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isApproved) return;

    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setIsUploading(true);

    const formData = new FormData(e.currentTarget);
    const fileInFormData = formData.get("image") as File;
    
    if (!fileInFormData || fileInFormData.size === 0) {
        toast.error("Selecione uma imagem para o presente.");
        setIsUploading(false);
        return;
    }

    try {
      const result = await createGift(formData);
      if (result.success) {
        formRef.current?.reset();
        setImagePreview(null);
        toast.success("Presente adicionado!");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-rose-100/20 border border-gray-100 overflow-hidden w-full transition-all">
      {/* HEADER DINÂMICO */}
      <div className={`p-5 border-b flex justify-between items-center ${isApproved ? 'bg-gray-50/50 border-gray-100' : 'bg-amber-50/50 border-amber-100'}`}>
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <PlusCircle size={18} className={isApproved ? "text-rose-500" : "text-amber-500"} />
            Novo Presente
          </h2>
          <p className="text-[11px] text-gray-500 font-medium italic">Adicione itens à sua lista</p>
        </div>
        {!isApproved && (
          <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1.5 rounded-full uppercase tracking-tighter">
            <Lock size={12} fill="currentColor" /> Bloqueado
          </div>
        )}
      </div>

      {/* ESTADO BLOQUEADO (KYC PENDENTE) */}
      {!isApproved ? (
        <div className="p-8 sm:p-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center rotate-3 border-2 border-amber-100 shadow-inner">
              <AlertCircle size={40} strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-amber-100 text-amber-600">
              <RefreshCw size={16} className={isValidating ? "animate-spin" : ""} />
            </div>
          </div>

          <div className="max-w-65 space-y-3">
            <h3 className="text-gray-900 font-extrabold text-lg leading-tight">Quase lá!</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Sua conta Asaas ainda não foi aprovada. Verifique seu e-mail para validar seus documentos.
            </p>
          </div>

          <div className="w-full mt-8 space-y-3">
            <Button 
              onClick={handleVerifyAccount}
              disabled={isValidating}
              className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 transition-all active:scale-95"
            >
              {isValidating ? (
                <><Loader2 className="animate-spin mr-2" /> Validando...</>
              ) : (
                <><RefreshCw size={18} className="mr-2" /> Verificar Agora</>
              )}
            </Button>
            
            <a 
              href="https://www.asaas.com" 
              target="_blank" 
              className="flex items-center justify-center gap-2 text-[11px] text-amber-600 font-bold uppercase tracking-widest hover:underline"
            >
              Ir para o Painel Asaas <ExternalLink size={12} />
            </a>
          </div>
        </div>
      ) : (
        /* FORMULÁRIO ATIVO */
        <form ref={formRef} onSubmit={handleOnSubmit} className="p-5 space-y-6" encType="multipart/form-data">
          
          {/* UPLOAD DE IMAGEM OTIMIZADO MOBILE */}
          <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Imagem do Produto</Label>
            <div className="relative w-full aspect-video group">
              <input ref={fileInputRef} id="gift-image" type="file" name="image" className="hidden" accept="image/*" onChange={handleImageChange} />
              
              {imagePreview ? (
                <div className="relative w-full h-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-3 right-3 p-2.5 bg-rose-500 text-white rounded-full shadow-lg active:scale-90 transition-transform"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <label htmlFor="gift-image" className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-rose-100 bg-rose-50/20 rounded-3xl cursor-pointer hover:bg-rose-50 transition-colors active:bg-rose-100">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-50 mb-3">
                        <ImagePlus className="w-8 h-8 text-rose-400" />
                    </div>
                    <span className="text-xs font-bold text-rose-500">Toque para selecionar foto</span>
                    <span className="text-[10px] text-rose-300 mt-1 uppercase font-bold tracking-tighter">Máximo 5MB</span>
                </label>
              )}
            </div>
          </div>

          {/* INPUTS DE TEXTO */}
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                <Tag size={14} className="text-rose-400" /> Título do Presente
              </Label>
              <Input
                name="title"
                required
                placeholder="Ex: Jogo de Panelas Le Creuset"
                className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-rose-50 border-none text-sm font-medium transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                        <DollarSign size={14} className="text-rose-400" /> Preço (R$)
                    </Label>
                    <Input
                        name="price"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        required
                        placeholder="0,90"
                        className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-rose-50 border-none text-sm font-bold transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                        <Layers size={14} className="text-rose-400" /> Categoria
                    </Label>
                    <div className="relative">
                        <select name="category" className="h-14 w-full rounded-2xl border-none bg-gray-50/50 focus:bg-white px-4 text-xs font-bold appearance-none transition-all">
                            <option value="Cozinha">🏠 Cozinha</option>
                            <option value="Viagem">✈️ Viagem</option>
                            <option value="Lazer">🥂 Lazer</option>
                            <option value="Outros">🎁 Outros</option>
                        </select>
                    </div>
                </div>
            </div>
          </div>

          {/* CHECKBOX ESTILIZADO */}
          <div className="flex items-center justify-between p-4 bg-rose-50/40 rounded-2xl border border-rose-100/50 group">
               <div className="flex flex-col">
                    <span className="text-[11px] font-black text-rose-800 uppercase tracking-widest">Presente Exclusivo</span>
                    <span className="text-[10px] text-rose-400 font-medium">Apenas 1 pessoa pode comprar</span>
               </div>
               <input
                  type="checkbox"
                  id="isExclusive"
                  name="isExclusive"
                  defaultChecked={true}
                  className="w-7 h-7 rounded-lg accent-rose-600 border-rose-200 transition-all cursor-pointer"
              />
          </div>

          <Button
            type="submit"
            disabled={isUploading}
            className="w-full h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-xl shadow-rose-200 text-base font-black transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {isUploading ? (
              <><Loader2 className="animate-spin" size={24} /> Salvando...</>
            ) : (
              <><Check size={24} strokeWidth={3} /> Criar Presente</>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}