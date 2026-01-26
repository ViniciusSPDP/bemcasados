"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, CreditCard, Barcode, QrCode, Copy, CheckCircle2, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { calculateTotalWithFees } from "@/lib/fees";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

const checkoutSchema = z.object({
    guestName: z.string().min(3, "Nome muito curto"),
    guestEmail: z.string().email("E-mail inválido"),
    guestCPFCNPJ: z.string().min(11, "CPF/CNPJ inválido"),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
    installments: z.number().min(1).max(12),
    message: z.string().max(500).optional(),
    creditCard: z.object({
        holderName: z.string().optional(),
        number: z.string().optional(),
        expiryMonth: z.string().optional(),
        expiryYear: z.string().optional(),
        ccv: z.string().optional(),
    }).optional()
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface checkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    gift: { id: string; title: string; price: number; } | null;
}

// Interface corrigida para as opções de pagamento
interface PaymentOptionProps {
    value: "CREDIT_CARD" | "BOLETO" | "PIX";
    register: UseFormRegister<CheckoutFormData>;
    current: "CREDIT_CARD" | "BOLETO" | "PIX" | undefined;
    icon: React.ReactNode;
    label: string;
}

export function CheckoutModal({ isOpen, onClose, gift }: checkoutModalProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [transactionId, setTransactionId] = useState<string | null>(null);
    const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    
    const router = useRouter();
    const { slug } = useParams();
    
    const [pixData, setPixData] = useState<{ encodedImage: string; payload: string } | null>(null);
    const [boletoData, setBoletoData] = useState<{ barCode: string; pdfUrl: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: { paymentMethod: "PIX", installments: 1 },
    });

    const selectedMethod = watch("paymentMethod");
    const selectedInstallments = watch("installments");

    useEffect(() => {
        if (transactionId && (pixData || boletoData)) {
            pollingInterval.current = setInterval(async () => {
                try {
                    const res = await fetch(`/api/checkout/status/${transactionId}`);
                    const data = await res.json();
                    if (data.status === "PAID") {
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                        toast.success("Pagamento confirmado!");
                        router.push(`/${slug}?success=true`);
                    }
                } catch (err) { console.error(err); }
            }, 3000);
        }
        return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
    }, [transactionId, pixData, boletoData, router, slug]);

    if (!isOpen || !gift) return null;

    const finalPrice = calculateTotalWithFees(Number(gift.price), selectedMethod || "PIX", selectedInstallments || 1);
    const installmentValue = finalPrice / (selectedInstallments || 1);

    const handleNextStep = async () => {
        const fieldsToValidate = ["guestName", "guestEmail", "guestCPFCNPJ"] as const;
        const isValid = await trigger(fieldsToValidate);
        if (isValid) setStep(2);
    };

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
            setTransactionId(result.transactionId);
            if (result.paymentMethod === "PIX") setPixData(result.pix);
            else if (result.paymentMethod === "BOLETO") setBoletoData(result.boleto);
            else if (result.paymentMethod === "CREDIT_CARD" && result.status === "PAID") router.push(`/${slug}?success=true`);
            else window.location.href = result.paymentUrl;
        } catch (error) { toast.error(error instanceof Error ? error.message : "Erro."); }
        finally { setIsLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] flex flex-col">
                
                {!pixData && !boletoData && (
                    <div className="flex w-full h-1.5 bg-rose-100">
                        <div className={`h-full bg-rose-500 transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
                    </div>
                )}

                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        {step === 2 && !pixData && !boletoData && (
                            <button onClick={() => setStep(1)} className="p-2 -ml-2 text-gray-400 hover:text-rose-500 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">
                                {pixData ? "Quase lá!" : step === 1 ? "Identificação" : "Pagamento"}
                            </h2>
                            <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider truncate max-w-[200px]">{gift.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 rounded-full"><X size={18} /></button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {!pixData && !boletoData ? (
                        <div className="space-y-5 pb-6">
                            {step === 1 ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Seu Nome</label>
                                        <input {...register("guestName")} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm" placeholder="Nome completo" />
                                        {errors.guestName && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.guestName.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">E-mail</label>
                                            <input {...register("guestEmail")} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm" placeholder="seu@email.com" />
                                            {errors.guestEmail && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.guestEmail.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">CPF</label>
                                            <input {...register("guestCPFCNPJ")} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm" placeholder="000.000.000-00" />
                                            {errors.guestCPFCNPJ && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.guestCPFCNPJ.message}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Mensagem (Opcional)</label>
                                        <textarea {...register("message")} rows={2} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm resize-none" placeholder="Felicidades ao casal!" />
                                    </div>
                                    <button onClick={handleNextStep} className="w-full h-14 bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                                        Próximo: Pagamento <ArrowLeft size={18} className="rotate-180" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-3 gap-2">
                                        <PaymentOption value="PIX" register={register} current={selectedMethod} icon={<QrCode size={18} />} label="PIX" />
                                        <PaymentOption value="BOLETO" register={register} current={selectedMethod} icon={<Barcode size={18} />} label="Boleto" />
                                        <PaymentOption value="CREDIT_CARD" register={register} current={selectedMethod} icon={<CreditCard size={18} />} label="Cartão" />
                                    </div>

                                    {selectedMethod === "CREDIT_CARD" && (
                                        <div className="p-4 bg-gray-900 rounded-2xl space-y-3 shadow-xl">
                                            <input {...register("creditCard.number")} className="w-full h-11 px-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-rose-500" placeholder="Número do Cartão" />
                                            <div className="grid grid-cols-3 gap-2">
                                                <input {...register("creditCard.expiryMonth")} maxLength={2} className="h-11 text-center bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="MM" />
                                                <input {...register("creditCard.expiryYear")} maxLength={4} className="h-11 text-center bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="AAAA" />
                                                <input {...register("creditCard.ccv")} maxLength={4} className="h-11 text-center bg-white/10 border border-white/20 rounded-lg text-white text-sm" placeholder="CVV" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Total a pagar</p>
                                            <p className="text-xl font-black text-rose-900 leading-none">
                                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalPrice)}
                                            </p>
                                        </div>
                                        {selectedInstallments > 1 && (
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-rose-400 uppercase">Parcelas</p>
                                                <p className="text-sm font-bold text-rose-800">{selectedInstallments}x {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installmentValue)}</p>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={handleSubmit(onSubmit)} disabled={isLoading} className="w-full h-14 bg-gray-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50">
                                        {isLoading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={18} /> Confirmar Presente</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-4 text-center space-y-6">
                            {pixData ? (
                                <>
                                    <div className="mx-auto w-48 h-48 p-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                        <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="QR Code" className="w-full h-full" />
                                    </div>
                                    <button onClick={() => { navigator.clipboard.writeText(pixData.payload); setCopied(true); toast.success("Código Copiado!"); }} className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                        {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />} {copied ? "Código Copiado!" : "Copiar Código PIX"}
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Código de Barras</p>
                                        <p className="text-xs font-mono break-all text-gray-600">{boletoData?.barCode}</p>
                                    </div>
                                    <a href={boletoData?.pdfUrl} target="_blank" className="w-full h-12 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                        <ExternalLink size={18} /> Visualizar Boleto PDF
                                    </a>
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-3 text-emerald-600 font-bold text-[11px] bg-emerald-50 p-3 rounded-xl">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Aguardando pagamento...
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Função tipada corretamente para evitar o erro de 'any'
function PaymentOption({ value, register, current, icon, label }: PaymentOptionProps) {
    return (
        <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${current === value ? "border-rose-500 bg-rose-50 text-rose-600 shadow-sm" : "border-gray-50 bg-gray-50 text-gray-400"}`}>
            <input type="radio" value={value} {...register("paymentMethod")} className="hidden" />
            {icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </label>
    );
}