"use client";

import { useRef } from "react";
import { createGift } from "@/actions/gift-actions";
import { PlusCircle } from "lucide-react";

export function GiftForm() {
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(formData: FormData) {
        await createGift(formData);
        formRef.current?.reset();
        alert("Presente criado com sucesso!");
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PlusCircle size={20} className="text-rose-600" />
                Novo Presente
            </h2>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Título</label>
                        <input
                            name="title"
                            required
                            placeholder="Ex: Jantar"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Preço (R$)</label>
                        <input
                            name="price"
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Categoria</label>
                        <select
                            name="category"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                        >
                            <option value="Cozinha">Cozinha</option>
                            <option value="Viagem">Viagem</option>
                            <option value="Lazer">Lazer</option>
                            <option value="Casa">Casa</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">URL Imagem</label>
                        <input
                            name="imageUrl"
                            placeholder="https://..."
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-rose-600 text-white font-bold py-2 rounded-lg hover:bg-rose-700 transition"
                >
                    Salvar
                </button>
            </form>
        </div>
    );
}