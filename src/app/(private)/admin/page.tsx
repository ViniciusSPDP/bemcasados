// src/app/(private)/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { logoutAction } from "@/actions/auth";
import { deleteGift } from "@/actions/gift-actions";
import { isAsaasAccountApproved, getAsaasBalance, getAsaasTransferHistory } from "@/services/asaas";

// Componentes
import { GiftForm } from "@/components/private/admin/gift-form";
import { EventSettingsForm } from "@/components/private/admin/event-settings-form";
import { AsaasOnboardingForm } from "@/components/private/admin/asaas-onboarding-form";
import { BankSettingsForm } from "@/components/private/admin/bank-settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KYCButton } from "@/components/private/admin/kyc-button";
import { WithdrawButton } from "@/components/private/admin/withdraw-button";
import Image from "next/image";

// Ícones
import { 
  Trash2, 
  DollarSign, 
  Gift, 
  TrendingUp, 
  AlertCircle, 
  LogOut, 
  Settings, 
  LayoutDashboard,
  ExternalLink,
  Heart, 
  FileCheck,
  ShieldCheck,
  Wallet,
  Clock,
  ArrowDownCircle
} from "lucide-react";

export const dynamic = "force-dynamic";
const isLocal = process.env.NODE_ENV === 'development';

// --- TIPAGENS ---

interface StatCardProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    value: string;
    description?: string;
}

// Interface para as transferências do Asaas
interface AsaasTransfer {
    id: string;
    value: number;
    dateCreated: string;
    status: "PENDING" | "DONE" | "FAILED" | "CANCELLED";
}

export default async function AdminPage() {
    const session = await verifySession();

    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        include: { galleryItems: { orderBy: { orderIndex: 'asc' } } }
    });

    if (!event) {
        return (
            <div className="flex h-screen items-center justify-center p-6 flex-col gap-6 bg-gray-50">
                 <div className="bg-white p-8 rounded-3xl shadow-lg text-center space-y-4 max-w-md border border-gray-100">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Nenhum evento encontrado</h1>
                        <p className="text-gray-500 mt-2">Parece que você tem uma conta, mas não criou um evento ainda.</p>
                    </div>
                    <form action={logoutAction} className="pt-4">
                        <button className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <LogOut size={18} /> Sair da conta
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    if (!event.walletId || !event.asaasApiKey) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
                <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100 animate-in fade-in zoom-in duration-300">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <DollarSign size={40} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quase lá!</h1>
                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Ative sua carteira para começar a receber presentes.</p>
                    </div>
                    <AsaasOnboardingForm />
                </div>
            </div>
        );
    }

    // Consultas Paralelas com Tipagem
    const [isApproved, availableBalance, transfersData] = await Promise.all([
        isAsaasAccountApproved(event.asaasApiKey),
        getAsaasBalance(event.asaasApiKey),
        getAsaasTransferHistory(event.asaasApiKey)
    ]);

    // Garantir que transfers seja tratado como o array de nossa interface
    const transfers = transfersData as AsaasTransfer[];

    const totalReceived = await prisma.transaction.aggregate({
        where: { status: "PAID", gift: { eventId: event.id } },
        _sum: { amountOriginal: true },
    })

    const totalGiftsSold = await prisma.transaction.count({
        where: { status: "PAID", gift: { eventId: event.id } },
    })

    const recentTransactions = await prisma.transaction.findMany({
        where: { status: "PAID", gift: { eventId: event.id } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { gift: true },
    });

    const gifts = await prisma.gift.findMany({
        where: { eventId: event.id },
        orderBy: { createdAt: "desc" },
    });

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                        <Heart className="text-rose-600 w-5 h-5" fill="currentColor" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">Olá, {event.coupleName.split(' ')[0]}</h1>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full inline-block animate-pulse ${isApproved ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                            {isApproved ? 'Conta Verificada' : 'Aguardando Verificação'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                     <a href={`/${event.slug}`} target="_blank" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors">
                        <ExternalLink size={16} /> Ver Site
                    </a>
                    <form action={logoutAction}><button type="submit" className="p-2 text-gray-400 hover:text-red-600 transition-colors"><LogOut size={20} /></button></form>
                </div>
            </div>
          </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <Tabs defaultValue="dashboard" className="w-full">
            <div className="flex justify-center md:justify-start mb-6">
                <TabsList className="bg-white border border-gray-200 p-1 rounded-xl h-auto shadow-sm">
                    <TabsTrigger value="dashboard" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all flex items-center gap-2 font-bold"><LayoutDashboard size={18}/> Painel</TabsTrigger>
                    <TabsTrigger value="settings" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all flex items-center gap-2 font-bold"><Settings size={18}/> Personalizar</TabsTrigger>
                    <TabsTrigger value="kyc" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all flex items-center gap-2 font-bold"><FileCheck size={18}/> Documentos</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="dashboard" className="space-y-8 animate-in fade-in duration-500">
                {!isApproved && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm font-bold">
                        <AlertCircle className="text-amber-600" size={20} />
                        <p className="text-xs text-amber-700 uppercase tracking-tight">Verificação Pendente: Acesse a aba Documentos para liberar saques.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-blue-600">
                             <Wallet size={80} />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg text-blue-600 bg-blue-50"><Wallet size={20} /></div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Saldo Disponível</p>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900">{formatCurrency(availableBalance)}</h3>
                        
                        <WithdrawButton balance={availableBalance} isApproved={isApproved} />
                        
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium justify-center">
                            <Clock size={12} />
                            <span>Compensação PIX: Instantânea | Cartão: 30 dias</span>
                        </div>
                    </div>

                    <StatCard 
                        icon={<DollarSign size={24} />} 
                        color="text-emerald-600 bg-emerald-50" 
                        label="Total Arrecadado" 
                        value={formatCurrency(Number(totalReceived._sum.amountOriginal || 0))} 
                        description="Valor bruto acumulado"
                    />
                    <StatCard 
                        icon={<Gift size={24} />} 
                        color="text-rose-600 bg-rose-50" 
                        label="Presentes" 
                        value={totalGiftsSold.toString()} 
                        description="Presentes recebidos"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-8">
                        <GiftForm />
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between bg-gray-50/30 font-bold">
                                <h2 className="text-lg text-gray-800 flex items-center gap-2"><Gift className="text-rose-500" size={20}/> Meus Presentes</h2>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-120 overflow-y-auto">
                                {gifts.map((gift) => (
                                <div key={gift.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden relative shrink-0">
                                        {gift.imageUrl && <Image src={gift.imageUrl} alt="" fill className="object-cover" unoptimized={isLocal} />}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2"><h3 className="font-bold text-gray-900 truncate text-sm">{gift.title}</h3><p className="text-rose-600 font-bold text-xs">{formatCurrency(Number(gift.price))}</p></div>
                                    <form action={deleteGift.bind(null, gift.id)}><button className="text-gray-300 hover:text-red-500 p-2 transition-all"><Trash2 size={16} /></button></form>
                                </div>))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <ArrowDownCircle className="text-blue-500" size={20} /> Histórico de Saques
                            </h2>
                            {transfers.length === 0 ? (
                                <p className="text-center py-6 text-xs text-gray-400 font-medium italic">Nenhum saque realizado até o momento.</p>
                            ) : (
                                <div className="space-y-4">
                                    {transfers.map((t) => (
                                        <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div>
                                                <p className="text-xs font-bold text-gray-900">
                                                    {t.dateCreated.split('-').reverse().join('/')}
                                                </p>
                                                <p className={`text-[10px] uppercase font-bold ${t.status === 'DONE' ? 'text-green-600' : 'text-blue-500'}`}>
                                                    {t.status === 'DONE' ? 'Concluído' : 'Processando'}
                                                </p>
                                            </div>
                                            <span className="text-sm font-black text-gray-700">-{formatCurrency(t.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <TrendingUp className="text-emerald-500" size={20} /> Vendas Recentes
                            </h2>
                            {recentTransactions.length === 0 ? <p className="text-center py-6 text-xs text-gray-400 font-medium italic">Nenhuma venda realizada.</p> : (
                                <div className="space-y-4">
                                    {recentTransactions.map((t) => (
                                    <div key={t.id} className="relative pl-4 border-l-2 border-rose-100 py-1">
                                        <div className="flex justify-between mb-1"><p className="font-bold text-xs text-gray-800">{t.guestName}</p><span className="text-emerald-600 font-bold text-xs">{formatCurrency(Number(t.amountOriginal))}</span></div>
                                        <p className="text-[10px] text-gray-500 truncate">Presente: {t.gift.title}</p>
                                    </div>))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="kyc">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
                        {isApproved ? (
                            <div className="py-10 animate-in fade-in zoom-in">
                                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <ShieldCheck size={40} />
                                </div>
                                <h2 className="text-2xl font-bold text-emerald-600 tracking-tight">Identidade Verificada!</h2>
                                <p className="text-gray-500 mt-4 text-sm font-medium">Sua conta está aprovada e pronta para saques.</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><FileCheck size={32} /></div>
                                <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Validar Identidade</h2>
                                <p className="text-xs text-gray-500 mt-2 mb-8">Obrigatório para transferir os presentes para sua conta.</p>
                                <KYCButton />
                            </>
                        )}
                    </div>
                    <BankSettingsForm />
                </div>
            </TabsContent>

            <TabsContent value="settings">
                <div className="max-w-3xl mx-auto"><EventSettingsForm event={event} /></div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value, description }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-4 shadow-sm transition hover:shadow-md group">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
            </div>
            <div>
                <h3 className="text-3xl font-black text-gray-900 mt-1">{value}</h3>
                {description && <p className="text-[10px] text-gray-400 mt-1 font-bold italic">{description}</p>}
            </div>
        </div>
    )
}