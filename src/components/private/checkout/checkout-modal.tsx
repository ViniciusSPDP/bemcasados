"use client";

import { useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, CreditCard, Barcode, QrCode } from "lucide-react";
import { calculateTotalWithFees } from "@/lib/fees";

// ✅ CORREÇÃO: Remova o .default() do schema para manter o tipo obrigatório
const checkoutSchema = z.object({
    guestName: z.string().min(3, "O nome é muito curto"),
    guestEmail: z.string().email("E-mail inválido"),
    guestCPFCNPJ: z.string().min(11, "CPF/CNPJ inválido"),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
    installments: z.number().min(1).max(12), // ✅ Sem .default() aqui
    message: z.string().max(500).optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface checkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    gift: {
        id: string;
        title: string;
        price: number;
    } | null;
}

interface PaymentOptionProps {
    value: "CREDIT_CARD" | "BOLETO" | "PIX";
    register: UseFormRegister<CheckoutFormData>;
    current: string | undefined;
    icon: React.ReactNode;
    label: string;
}

export function CheckoutModal({ isOpen, onClose, gift }: checkoutModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<CheckoutFormData>({ // ✅ Adicione o tipo genérico aqui
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            paymentMethod: "PIX",
            installments: 1,
        },
    });

    const selectedMethod = watch("paymentMethod");
    const selectedInstallments = watch("installments");

    if (!isOpen || !gift) {
        return null;
    }

    const finalPrice = calculateTotalWithFees(
        Number(gift.price),
        selectedMethod || "PIX",
        selectedInstallments || 1 // ✅ Agora é number
    );

    const installmentValue = finalPrice / (selectedInstallments || 1);

    async function onSubmit(data: CheckoutFormData) {
        setIsLoading(true);
        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ giftId: gift?.id, ...data }),
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Erro no pagamento.");

            window.location.href = result.paymentUrl;
        } catch (error) {
            alert(error instanceof Error ? error.message : "Erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="bg-rose-50 p-6 flex justify-between items-start border-b border-rose-100">
                    <div>
                        <h2 className="text-xl font-bold text-rose-900">Presentear os Noivos</h2>
                        <p className="text-rose-700 text-sm mt-1">{gift.title}</p>
                    </div>
                    <button onClick={onClose} className="text-rose-400 hover:text-rose-600 transition">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
                        <input {...register("guestName")} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Ex: João da Silva" />
                        {errors.guestName && <span className="text-xs text-red-500">{errors.guestName.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input {...register("guestEmail")} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" placeholder="joao@email.com" />
                            {errors.guestEmail && <span className="text-xs text-red-500">{errors.guestEmail.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                            <input {...register("guestCPFCNPJ")} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" placeholder="000.000.000-00" />
                            {errors.guestCPFCNPJ && <span className="text-xs text-red-500">{errors.guestCPFCNPJ.message}</span>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem (Opcional)</label>
                        <textarea {...register("message")} rows={2} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none" placeholder="Deixe uma mensagem..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-3 gap-2">
                            <PaymentOption value="PIX" register={register} current={selectedMethod} icon={<QrCode size={20} />} label="PIX" />
                            <PaymentOption value="BOLETO" register={register} current={selectedMethod} icon={<Barcode size={20} />} label="Boleto" />
                            <PaymentOption value="CREDIT_CARD" register={register} current={selectedMethod} icon={<CreditCard size={20} />} label="Cartão" />
                        </div>
                    </div>

                    {(selectedMethod === "CREDIT_CARD" || selectedMethod === "BOLETO") && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Parcelamento
                            </label>
                            <select
                                {...register("installments", { valueAsNumber: true })} // ✅ IMPORTANTE: valueAsNumber converte string para number
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                            >
                                <option value="1">À vista</option>
                                <option value="2">2x (com juros)</option>
                                <option value="3">3x (com juros)</option>
                                <option value="4">4x (com juros)</option>
                                <option value="5">5x (com juros)</option>
                                <option value="6">6x (com juros)</option>
                                {selectedMethod === "CREDIT_CARD" && (
                                    <>
                                        <option value="7">7x (com juros)</option>
                                        <option value="8">8x (com juros)</option>
                                        <option value="9">9x (com juros)</option>
                                        <option value="10">10x (com juros)</option>
                                        <option value="11">11x (com juros)</option>
                                        <option value="12">12x (com juros)</option>
                                    </>
                                )}
                            </select>
                            <p className="text-xs text-amber-600 mt-1">
                                * Taxas administrativas são adicionadas ao valor das parcelas.
                            </p>
                        </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg flex flex-col gap-1 border border-gray-100">
                        <div className="flex justify-between items-end">
                            <span className="text-gray-600 text-sm">Total a pagar:</span>
                            <span className="text-xl font-bold text-rose-600">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalPrice)}
                            </span>
                        </div>
                        {selectedInstallments > 1 && (
                            <div className="text-right text-sm text-gray-500">
                                {selectedInstallments}x de {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installmentValue)}
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70">
                        {isLoading ? <Loader2 className="animate-spin" /> : "Confirmar Pagamento"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function PaymentOption({ value, register, current, icon, label }: PaymentOptionProps) {
    return (
        <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-1 transition-all ${current === value ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 hover:border-rose-200 hover:bg-gray-50 text-gray-600"}`}>
            <input type="radio" value={value} {...register("paymentMethod")} className="hidden" />
            {icon}
            <span className="text-xs font-medium">{label}</span>
        </label>
    );
}