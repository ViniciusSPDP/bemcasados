"use client";

import { useRef, useState, ChangeEvent } from "react";
import { createGift } from "@/actions/gift-actions";
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
  Check
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GiftFormProps {
  isApproved: boolean;
}

export function GiftForm({ isApproved }: GiftFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Aumentamos o limite para 5MB pois fotos de celulares modernos são grandes
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande! Máximo 5MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleOnSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!isApproved) {
      toast.error("Sua conta precisa estar aprovada.");
      return;
    }

    // No celular, garantimos que o foco saia dos inputs para salvar os dados
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    setIsUploading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Validação extra para celular
    const fileInFormData = formData.get("image") as File;
    
    if (!fileInFormData || fileInFormData.size === 0) {
        toast.error("A imagem não foi detectada. Tente selecionar novamente.");
        setIsUploading(false);
        return;
    }

    try {
      const result = await createGift(formData);
      if (result.success) {
        formRef.current?.reset();
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast.success("Presente criado com sucesso!");
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar presente.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
      <div className="p-4 sm:p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
            <PlusCircle size={20} className="text-rose-600" />
            Novo Presente
          </h2>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Cadastre os itens para seus convidados.</p>
        </div>
        {!isApproved && (
          <span className="bg-amber-100 text-amber-700 text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
            <Lock size={10} /> Bloqueado
          </span>
        )}
      </div>

      {!isApproved ? (
        <div className="p-6 sm:p-10 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <AlertCircle size={30} />
          </div>
          <div className="max-w-xs">
            <h3 className="text-gray-900 font-bold text-sm sm:text-base tracking-tight">Verificação Necessária</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Sua carteira ainda não foi aprovada. Complete a validação para liberar o cadastro.
            </p>
          </div>
        </div>
      ) : (
        <form 
            ref={formRef} 
            onSubmit={handleOnSubmit} 
            className="p-4 sm:p-6 space-y-5 sm:space-y-6"
            encType="multipart/form-data"
        >
          <div className="space-y-2">
            <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
              Imagem do Presente
            </Label>
            
            <div className="relative w-full h-40 sm:h-48 group">
              {/* O input precisa existir fora de condicionais para não se perder no mobile */}
              <input 
                ref={fileInputRef}
                id="gift-image-input-mobile"
                type="file" 
                name="image" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageChange}
              />

              {imagePreview ? (
                <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-rose-100 shadow-inner">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                        setImagePreview(null);
                        if(fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-rose-600 shadow-md hover:bg-white active:scale-90 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label 
                  htmlFor="gift-image-input-mobile"
                  className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-rose-300 transition-all active:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="p-3 bg-rose-50 rounded-full mb-2">
                        <ImagePlus className="w-6 h-6 sm:w-8 sm:h-8 text-rose-400" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600 text-center">Tocar para enviar foto</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Tag size={12} /> Título
              </Label>
              <Input
                name="title"
                required
                inputMode="text"
                placeholder="Ex: Jantar Romântico"
                className="h-12 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <DollarSign size={12} /> Preço (R$)
              </Label>
              <Input
                name="price"
                type="number"
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0,00"
                className="h-12 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Layers size={12} /> Categoria
              </Label>
              <select
                name="category"
                className="flex h-12 w-full rounded-xl border border-gray-100 bg-gray-50/30 px-3 py-2 text-xs sm:text-sm focus:outline-none appearance-none cursor-pointer"
              >
                <option value="Cozinha">🏠 Casa / Cozinha</option>
                <option value="Viagem">✈️ Viagem / Lua de Mel</option>
                <option value="Lazer">🥂 Lazer / Experiência</option>
                <option value="Outros">🎁 Outros</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-rose-50/30 rounded-xl border border-rose-100/50 h-12">
               <Label htmlFor="isExclusive" className="text-xs font-bold text-rose-800 cursor-pointer flex items-center gap-2">
                  <Check size={14} /> Único?
                </Label>
              <input
                  type="checkbox"
                  id="isExclusive"
                  name="isExclusive"
                  defaultChecked={true}
                  className="w-6 h-6 rounded-md accent-rose-600 border-rose-200"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isUploading}
            className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-lg shadow-rose-100 text-base font-bold transition-transform active:scale-95"
          >
            {isUploading ? (
              <><Loader2 className="animate-spin mr-2" size={20} /> Salvando...</>
            ) : (
              "Criar Presente Agora"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}