"use client";

import { useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, CreditCard, Barcode, QrCode } from "lucide-react";
import { calculateTotalWithFees } from "@/services/asaas";

//Validação dos dados do formulário
const checkoutSchema = z.object({
    guestName: z.string().min(3, "O nome é muito curto"),
    guestEmail: z.string().email("E-mail inválido"),
    guestCPFCNPJ: z.string().min(11, "CPF/CNPJ inválido"),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
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

//Interface de pagamento
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
    } = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            paymentMethod: "PIX",
        },
    });

    //Depende do método de pagamento selecionado, calcula o valor total com taxas
    const selectedMethod = watch("paymentMethod");

    if (!isOpen || !gift) {
        return null;
    }

    const finalPrice = calculateTotalWithFees(
        Number(gift.price),
        selectedMethod || "PIX"
    );

    async function onSubmit(data: CheckoutFormData) {
        setIsLoading(true);
        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    giftId: gift?.id,
                    ...data,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Erro no processamento do pagamento.");
            }

            //Redireciona para o link de pagamento
            window.location.href = result.paymentUrl;
        } catch (error) {
            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert("Erro ao processar o pagamento.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Cabeçalho */}
                <div className="bg-rose-50 p-6 flex justify-between items-start border-b border-rose-100">
                    <div>
                        <h2 className="text-xl font-bold text-rose-900">
                            Presentear os Noivos
                        </h2>
                        <p className="text-rose-700 text-sm mt-1">{gift.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-rose-400 hover:text-rose-600 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Seu Nome
                        </label>
                        <input
                            {...register("guestName")}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                            placeholder="Ex: João da Silva"
                        />
                        {errors.guestName && (
                            <span className="text-xs text-red-500">
                                {errors.guestName.message}
                            </span>
                        )}
                    </div>

                    {/* Email e CPF (Grid) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                {...register("guestEmail")}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                                placeholder="joao@email.com"
                            />
                            {errors.guestEmail && (
                                <span className="text-xs text-red-500">
                                    {errors.guestEmail.message}
                                </span>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                CPF
                            </label>
                            <input
                                {...register("guestCPFCNPJ")}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                                placeholder="000.000.000-00"
                            />
                            {errors.guestCPFCNPJ && (
                                <span className="text-xs text-red-500">
                                    {errors.guestCPFCNPJ.message}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Mensagem */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mensagem para os noivos (Opcional)
                        </label>
                        <textarea
                            {...register("message")}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                            placeholder="Escreva algo carinhoso..."
                        />
                    </div>

                    {/* Método de Pagamento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Forma de Pagamento
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <PaymentOption
                                value="PIX"
                                register={register}
                                current={selectedMethod}
                                icon={<QrCode size={20} />}
                                label="PIX"
                            />
                            <PaymentOption
                                value="BOLETO"
                                register={register}
                                current={selectedMethod}
                                icon={<Barcode size={20} />}
                                label="Boleto"
                            />
                            <PaymentOption
                                value="CREDIT_CARD"
                                register={register}
                                current={selectedMethod}
                                icon={<CreditCard size={20} />}
                                label="Cartão"
                            />
                        </div>
                    </div>

                    {/* Resumo do Valor */}
                    <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border border-gray-100">
                        <span className="text-gray-600 text-sm">Valor total a pagar:</span>
                        <span className="text-xl font-bold text-rose-600">
                            {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            }).format(finalPrice)}
                        </span>
                    </div>

                    {/* Botão de Ação */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" /> Processando...
                            </>
                        ) : (
                            "Confirmar Pagamento"
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-2">
                        Ambiente seguro. Suas taxas ajudam a manter a plataforma.
                    </p>
                </form>
            </div>
        </div>
    );
}

// Componente auxiliar para os botões de pagamento
function PaymentOption({ value, register, current, icon, label }: PaymentOptionProps) {
    return (
        <label
            className={`
      cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-1 transition-all
      ${current === value
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-gray-200 hover:border-rose-200 hover:bg-gray-50 text-gray-600"
                }
    `}
        >
            <input
                type="radio"
                value={value}
                {...register("paymentMethod")}
                className="hidden"
            />
            {icon}
            <span className="text-xs font-medium">{label}</span>
        </label>
    );
}
