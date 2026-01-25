"use client";

import { useRef, useState, ChangeEvent } from "react";
import { createGift } from "@/actions/gift-actions";
import { PlusCircle, Loader2, ImagePlus, X, Tag, DollarSign, Layers } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Recomendo usar sonner para avisos bonitos

export function GiftForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Função para mostrar o preview da imagem
  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsUploading(true);
    try {
      await createGift(formData);
      formRef.current?.reset();
      setImagePreview(null);
      toast.success("Presente criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar presente.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <PlusCircle size={20} className="text-rose-600" />
          Novo Presente
        </h2>
        <p className="text-xs text-gray-500 mt-1">Cadastre os itens que seus convidados poderão escolher.</p>
      </div>

      <form ref={formRef} action={handleSubmit} className="p-6 space-y-6">
        {/* Seção 1: Imagem */}
        <div className="flex flex-col items-center justify-center">
          <Label className="self-start mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Imagem do Presente
          </Label>
          <div className="relative w-full group">
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-rose-100">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-rose-600 shadow-sm hover:bg-white"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-rose-300 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImagePlus className="w-10 h-10 text-gray-300 mb-2 group-hover:text-rose-400" />
                  <p className="text-sm text-gray-500">Clique para enviar foto</p>
                  <p className="text-[10px] text-gray-400 mt-1">JPG, PNG ou WebP (Máx. 2MB)</p>
                </div>
                <input 
                  type="file" 
                  name="image" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  required 
                />
              </label>
            )}
          </div>
        </div>

        {/* Seção 2: Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Tag size={12} /> Título do Presente
            </Label>
            <Input
              name="title"
              required
              placeholder="Ex: Jantar Romântico em Paris"
              className="h-11 rounded-xl border-gray-200 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <DollarSign size={12} /> Preço (R$)
            </Label>
            <Input
              name="price"
              type="number"
              step="0.01"
              required
              placeholder="0,00"
              className="h-11 rounded-xl border-gray-200 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Seção 3: Detalhes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Layers size={12} /> Categoria
            </Label>
            <select
              name="category"
              className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
            >
              <option value="Cozinha">🏠 Casa / Cozinha</option>
              <option value="Viagem">✈️ Viagem / Lua de Mel</option>
              <option value="Lazer">🥂 Lazer / Experiência</option>
              <option value="Outros">🎁 Outros</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 h-11">
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="isExclusive"
                name="isExclusive"
                defaultChecked={true}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              <Label
                htmlFor="isExclusive"
                className="ml-3 text-xs font-bold text-rose-900 cursor-pointer"
              >
                Presente Exclusivo
              </Label>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isUploading}
          className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-[0.98]"
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} /> Processando...
            </>
          ) : (
            "Criar Presente Agora"
          )}
        </Button>
      </form>
    </div>
  );
}