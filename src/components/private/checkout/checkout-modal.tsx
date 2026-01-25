"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, CreditCard, Barcode, QrCode, Copy, CheckCircle2, ArrowLeft, ExternalLink, ShieldCheck, Lock } from "lucide-react";
import { calculateTotalWithFees } from "@/lib/fees";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

const checkoutSchema = z.object({
    guestName: z.string().min(3, "O nome é muito curto"),
    guestEmail: z.string().email("E-mail inválido"),
    guestCPFCNPJ: z.string().min(11, "CPF/CNPJ inválido"),
    paymentMethod: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]),
    installments: z.number().min(1).max(12),
    message: z.string().max(500).optional(),
    creditCard: z.object({
        holderName: z.string().min(3, "Nome no cartão obrigatório").optional(),
        number: z.string().min(13, "Número inválido").optional(),
        expiryMonth: z.string().min(2).max(2).optional(),
        expiryYear: z.string().min(4).max(4).optional(),
        ccv: z.string().min(3).max(4).optional(),
    }).optional()
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
    const [transactionId, setTransactionId] = useState<string | null>(null);
    const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    
    const router = useRouter();
    const { slug } = useParams();
    
    const [pixData, setPixData] = useState<{ encodedImage: string; payload: string } | null>(null);
    const [boletoData, setBoletoData] = useState<{ barCode: string; pdfUrl: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            paymentMethod: "PIX",
            installments: 1,
        },
    });

    const selectedMethod = watch("paymentMethod");
    const selectedInstallments = watch("installments");

    // Lógica de Polling para detectar pagamento automático
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
                } catch (err) {
                    console.error("Erro no monitoramento:", err);
                }
            }, 3000);
        }

        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, [transactionId, pixData, boletoData, router, slug]);

    if (!isOpen || !gift) return null;

    const finalPrice = calculateTotalWithFees(
        Number(gift.price),
        selectedMethod || "PIX",
        selectedInstallments || 1
    );

    const installmentValue = finalPrice / (selectedInstallments || 1);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Código copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    const resetStates = () => {
        setPixData(null);
        setBoletoData(null);
        setTransactionId(null);
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

            if (result.paymentMethod === "PIX" && result.pix) {
                setPixData(result.pix);
            } else if (result.paymentMethod === "BOLETO" && result.boleto) {
                setBoletoData(result.boleto);
            } else if (result.paymentMethod === "CREDIT_CARD" && result.status === "PAID") {
                router.push(`/${slug}?success=true`);
            } else {
                window.location.href = result.paymentUrl;
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-10 sm:zoom-in duration-300 max-h-[95vh] flex flex-col">
                
                {/* HEADER */}
                <div className="bg-rose-50 p-6 flex justify-between items-center border-b border-rose-100 shrink-0">
                    <div className="flex items-center gap-3">
                        {(pixData || boletoData) && (
                            <button onClick={resetStates} className="p-2 bg-white hover:bg-rose-100 rounded-full transition-colors text-rose-600 shadow-sm">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-rose-900 leading-tight">
                                {pixData ? "Pague com PIX" : boletoData ? "Pague com Boleto" : "Presentear Noivos"}
                            </h2>
                            <p className="text-rose-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">{gift.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white text-rose-400 hover:text-rose-600 transition p-2 rounded-full shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {!pixData && !boletoData ? (
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 pb-10">
                            {/* SEÇÃO: DADOS DO CONVIDADO */}
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-400 tracking-widest px-1">
                                    <div className="w-1.5 h-3 bg-rose-500 rounded-full"></div> Seus Dados
                                </label>
                                <div className="grid grid-cols-1 gap-3">
                                    <input {...register("guestName")} className="w-full h-14 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium" placeholder="Seu nome completo" />
                                    {errors.guestName && <p className="text-[10px] text-red-500 font-bold ml-2 italic">{errors.guestName.message}</p>}
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <input {...register("guestEmail")} className="w-full h-14 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium text-sm" placeholder="E-mail" />
                                            {errors.guestEmail && <p className="text-[10px] text-red-500 font-bold ml-2 italic">{errors.guestEmail.message}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <input {...register("guestCPFCNPJ")} className="w-full h-14 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium text-sm" placeholder="CPF" />
                                            {errors.guestCPFCNPJ && <p className="text-[10px] text-red-500 font-bold ml-2 italic">{errors.guestCPFCNPJ.message}</p>}
                                        </div>
                                    </div>
                                    <textarea {...register("message")} rows={2} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none resize-none transition-all font-medium text-sm" placeholder="Deixe um recado especial para o casal..." />
                                </div>
                            </div>

                            {/* SEÇÃO: PAGAMENTO */}
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-400 tracking-widest px-1">
                                    <div className="w-1.5 h-3 bg-rose-500 rounded-full"></div> Forma de Pagamento
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <PaymentOption value="PIX" register={register} current={selectedMethod} icon={<QrCode size={22} />} label="PIX" />
                                    <PaymentOption value="BOLETO" register={register} current={selectedMethod} icon={<Barcode size={22} />} label="Boleto" />
                                    <PaymentOption value="CREDIT_CARD" register={register} current={selectedMethod} icon={<CreditCard size={22} />} label="Cartão" />
                                </div>
                            </div>

                            {/* CARTÃO DE CRÉDITO WHITE LABEL */}
                            {selectedMethod === "CREDIT_CARD" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 p-6 bg-gray-900 rounded-[2rem] text-white shadow-xl">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dados do Cartão</label>
                                        <Lock size={14} className="text-rose-500" />
                                    </div>
                                    <div className="space-y-3">
                                        <input {...register("creditCard.holderName")} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder:text-gray-500" placeholder="Nome impresso no cartão" />
                                        <input {...register("creditCard.number")} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder:text-gray-500" placeholder="0000 0000 0000 0000" />
                                        <div className="grid grid-cols-3 gap-3">
                                            <input {...register("creditCard.expiryMonth")} maxLength={2} className="h-12 text-center bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none text-white placeholder:text-gray-500" placeholder="MM" />
                                            <input {...register("creditCard.expiryYear")} maxLength={4} className="h-12 text-center bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none text-white placeholder:text-gray-500" placeholder="AAAA" />
                                            <input {...register("creditCard.ccv")} maxLength={4} className="h-12 text-center bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none text-white placeholder:text-gray-500" placeholder="CVV" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PARCELAMENTO */}
                            {(selectedMethod === "CREDIT_CARD" || selectedMethod === "BOLETO") && (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Parcelamento</label>
                                    <div className="relative">
                                        <select {...register("installments", { valueAsNumber: true })} className="w-full h-14 px-5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-gray-800 appearance-none shadow-sm">
                                            <option value="1">Pagamento à vista</option>
                                            {[2,3,4,5,6,7,8,9,10,11,12].map(i => (
                                                <option key={i} value={i}>{i}x (com taxas administrativas)</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-rose-500">
                                            <ArrowLeft size={16} className="-rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FOOTER: RESUMO E BOTÃO */}
                            <div className="space-y-4 pt-4">
                                <div className="bg-rose-600 p-6 rounded-[2rem] text-white shadow-xl shadow-rose-200 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><CheckCircle2 size={100} /></div>
                                    <div className="flex justify-between items-center relative z-10">
                                        <div>
                                            <span className="text-rose-100 text-[10px] font-black uppercase tracking-widest">Valor do Presente</span>
                                            <h3 className="text-3xl font-black leading-none tracking-tighter">
                                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalPrice)}
                                            </h3>
                                        </div>
                                        {selectedInstallments > 1 && (
                                            <div className="text-right">
                                                <p className="text-[10px] text-rose-200 font-bold uppercase tracking-widest leading-none">Parcelas</p>
                                                <p className="text-lg font-black">{selectedInstallments}x {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installmentValue)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full h-16 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-xl shadow-gray-200 active:scale-95 group">
                                    {isLoading ? <Loader2 className="animate-spin" /> : (
                                        <>
                                            Confirmar e Pagar
                                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                                                <ArrowLeft className="rotate-180" size={16} />
                                            </div>
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                    <ShieldCheck size={14} className="text-emerald-500" /> Ambiente 100% Criptografado e Seguro
                                </p>
                            </div>
                        </form>
                    ) : pixData ? (
                        /* TELA PIX WHITE LABEL */
                        <div className="p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500 pb-16">
                            
                            <div className="space-y-2 pt-4">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                                    <QrCode size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 leading-tight tracking-tighter">Finalize com PIX</h3>
                                <p className="text-gray-500 text-sm font-medium max-w-[240px] mx-auto leading-relaxed">Aponte a câmera do seu celular ou copie o código abaixo.</p>
                            </div>

                            <div className="relative mx-auto w-64 h-64 p-4 bg-white border-4 border-gray-50 rounded-[3.5rem] shadow-2xl flex items-center justify-center">
                                <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="QR Code PIX" className="w-full h-full object-contain" />
                            </div>

                            <div className="space-y-4 max-w-xs mx-auto">
                                <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Copia e Cola</p>
                                <div className="flex flex-col gap-3">
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-[10px] font-mono break-all text-gray-400 max-h-24 overflow-y-auto custom-scrollbar leading-relaxed">
                                        {pixData.payload}
                                    </div>
                                    <button onClick={() => handleCopy(pixData.payload)} className={`w-full py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg ${copied ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100'}`}>
                                        {copied ? <><CheckCircle2 size={20} /> Código Copiado!</> : <><Copy size={20} /> Copiar Código PIX</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* TELA BOLETO WHITE LABEL */
                        <div className="p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500 pb-16">
                            
                            <div className="space-y-2 pt-4">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                                    <Barcode size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter leading-tight">Boleto Digital</h3>
                                <p className="text-gray-500 text-sm font-medium max-w-[240px] mx-auto">Pronto para pagamento em qualquer banco ou lotérica.</p>
                            </div>

                            <div className="bg-gray-50 p-8 rounded-[3rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 group">
                                <Barcode className="text-gray-200 w-24 h-24 group-hover:scale-110 transition-transform opacity-50" />
                                <div className="space-y-2 w-full">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Linha Digitável</p>
                                    <p className="text-[11px] font-mono text-gray-600 break-all px-4 font-bold leading-relaxed">{boletoData?.barCode}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
                                <button onClick={() => boletoData && handleCopy(boletoData.barCode)} className={`w-full py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg ${copied ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-black shadow-gray-200'}`}>
                                    {copied ? <><CheckCircle2 size={20} /> Copiado!</> : <><Copy size={20} /> Copiar Código</>}
                                </button>
                                <a href={boletoData?.pdfUrl} target="_blank" rel="noopener noreferrer" className="w-full py-5 rounded-2xl border-2 border-gray-100 text-gray-600 font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors uppercase tracking-widest">
                                    <ExternalLink size={18} /> Baixar Boleto PDF
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* STATUS DE MONITORAMENTO (POLLING) */}
                {(pixData || boletoData) && (
                    <div className="p-6 bg-white border-t border-gray-50 shrink-0">
                        <div className="bg-emerald-50 p-5 rounded-[1.5rem] flex items-center gap-4 border border-emerald-100">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </div>
                            <p className="text-[10px] text-emerald-700 font-black uppercase tracking-[0.1em] leading-tight">
                                Monitorando pagamento em tempo real... <br />
                                <span className="opacity-60">Não saia desta tela.</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PaymentOption({ value, register, current, icon, label }: PaymentOptionProps) {
    return (
        <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 active:scale-90 ${current === value ? "border-rose-500 bg-rose-50/50 text-rose-700 shadow-inner" : "border-gray-50 bg-gray-50 hover:border-rose-100 hover:bg-white text-gray-400"}`}>
            <input type="radio" value={value} {...register("paymentMethod")} className="hidden" />
            <div className={`transition-transform duration-300 ${current === value ? "scale-110" : ""}`}>{icon}</div>
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </label>
    );
}