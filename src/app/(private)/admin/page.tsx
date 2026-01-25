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
  ArrowDownCircle,
  MailCheck
} from "lucide-react";

export const dynamic = "force-dynamic";
//const isLocal = process.env.NODE_ENV === 'development';

interface StatCardProps {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  description?: string;
}

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
      <div className="flex h-screen items-center justify-center p-6 flex-col gap-6 bg-gray-50 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg space-y-4 max-w-md border border-gray-100">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Nenhum evento encontrado</h1>
          <p className="text-gray-500">Crie seu primeiro evento para começar.</p>
          <form action={logoutAction} className="pt-4">
            <button className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
              <LogOut size={18} /> Sair
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!event.walletId || !event.asaasApiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <DollarSign size={32} className="sm:size-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Ative sua carteira</h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Dados necessários para receber via PIX/Cartão.</p>
          </div>
          <AsaasOnboardingForm />
        </div>
      </div>
    );
  }

  const [isApproved, availableBalance, transfersData] = await Promise.all([
    isAsaasAccountApproved(event.asaasApiKey),
    getAsaasBalance(event.asaasApiKey),
    getAsaasTransferHistory(event.asaasApiKey)
  ]);

  const transfers = transfersData as AsaasTransfer[];
  const totalReceived = await prisma.transaction.aggregate({
    where: { status: "PAID", gift: { eventId: event.id } },
    _sum: { amountOriginal: true },
  });
  const totalGiftsSold = await prisma.transaction.count({
    where: { status: "PAID", gift: { eventId: event.id } },
  });
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
      {/* Header Fixo e Responsivo */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                <Heart className="text-rose-600 w-5 h-5" fill="currentColor" />
              </div>
              <div className="hidden xs:block">
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate max-w-37.5 sm:max-w-none">
                  Olá, {event.coupleName.split(' ')[0]}
                </h1>
                <p className={`text-[10px] sm:text-xs flex items-center gap-1 font-medium ${isApproved ? 'text-green-600' : 'text-amber-600'}`}>
                  {isApproved ? 'Verificado' : 'Pendente'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/${event.slug}`} target="_blank" className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-all">
                <ExternalLink size={14} className="sm:size-4" /> <span className="hidden sm:inline">Ver Site</span>
              </a>
              <form action={logoutAction}>
                <button type="submit" className="p-2 text-gray-400 hover:text-red-600"><LogOut size={20} /></button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <Tabs defaultValue="dashboard" className="w-full">
          {/* Tabs Responsivas (Scroll lateral se necessário) */}
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-white border border-gray-200 p-1 rounded-xl h-auto shadow-sm min-w-max">
              <TabsTrigger value="dashboard" className="px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white flex items-center gap-2 text-sm sm:text-base font-bold transition-all"><LayoutDashboard size={16}/> Painel</TabsTrigger>
              <TabsTrigger value="settings" className="px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white flex items-center gap-2 text-sm sm:text-base font-bold transition-all"><Settings size={16}/> Personalizar</TabsTrigger>
              <TabsTrigger value="kyc" className="px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white flex items-center gap-2 text-sm sm:text-base font-bold transition-all"><FileCheck size={16}/> Conta</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 focus-visible:outline-none mt-4">
            {!isApproved && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start sm:items-center gap-3 shadow-sm">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <p className="text-[10px] sm:text-xs text-amber-700 uppercase font-bold leading-relaxed">
                  Verificação Pendente: Siga as instruções enviadas por e-mail pelo Asaas para liberar saques.
                </p>
              </div>
            )}

            {/* Grid de Stats - 1 col mobile, 3 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-3 shadow-sm relative overflow-hidden group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg text-blue-600 bg-blue-50"><Wallet size={20} /></div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Disponível</p>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{formatCurrency(availableBalance)}</h3>
                <WithdrawButton balance={availableBalance} isApproved={isApproved} />
                <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold justify-center mt-1">
                  <Clock size={10} /> <span>PIX: Instantâneo | Cartão: 30 dias</span>
                </div>
              </div>

              <StatCard
                icon={<DollarSign size={22} />}
                color="text-emerald-600 bg-emerald-50"
                label="Total Bruto"
                value={formatCurrency(Number(totalReceived._sum.amountOriginal || 0))}
              />
              <StatCard
                icon={<Gift size={22} />}
                color="text-rose-600 bg-rose-50"
                label="Qtd. Presentes"
                value={totalGiftsSold.toString()}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Lado Esquerdo: Formulário e Lista */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                <div className="bg-white rounded-3xl p-1 shadow-sm border border-gray-100">
                  <GiftForm isApproved={isApproved} />
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Gift className="text-rose-500" size={18}/> Meus Presentes
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-125 overflow-y-auto">
                    {gifts.length === 0 ? (
                      <p className="p-10 text-center text-xs text-gray-400 font-medium italic">Sua lista está vazia.</p>
                    ) : (
                      gifts.map((gift) => (
                        <div key={gift.id} className="p-4 hover:bg-gray-50 flex items-center gap-3 sm:gap-4 transition-colors">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg overflow-hidden relative shrink-0 border border-gray-50">
                            {gift.imageUrl && <Image src={gift.imageUrl} alt="" fill className="object-cover" unoptimized />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate text-xs sm:text-sm">{gift.title}</h3>
                            <p className="text-rose-600 font-black text-[10px] sm:text-xs">{formatCurrency(Number(gift.price))}</p>
                          </div>
                          <form action={deleteGift.bind(null, gift.id)}>
                            <button className="text-gray-300 hover:text-red-500 p-2 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </form>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Lado Direito: Histórico */}
              <div className="lg:col-span-5 space-y-6 sm:space-y-8">
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <ArrowDownCircle className="text-blue-500" size={18} /> Histórico de Saques
                  </h2>
                  <div className="space-y-3">
                    {transfers.length === 0 ? (
                      <p className="text-center py-4 text-[10px] text-gray-400 font-bold italic">Sem saques recentes.</p>
                    ) : (
                      transfers.map((t) => (
                        <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-50">
                          <div>
                            <p className="text-[10px] font-bold text-gray-900">{t.dateCreated.split('-').reverse().join('/')}</p>
                            <p className={`text-[9px] uppercase font-black ${t.status === 'DONE' ? 'text-green-600' : 'text-blue-500'}`}>{t.status}</p>
                          </div>
                          <span className="text-xs sm:text-sm font-black text-gray-700">-{formatCurrency(t.value)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" size={18} /> Vendas Recentes
                  </h2>
                  <div className="space-y-4">
                    {recentTransactions.length === 0 ? (
                      <p className="text-center py-4 text-[10px] text-gray-400 font-bold italic">Sem vendas.</p>
                    ) : (
                      recentTransactions.map((t) => (
                        <div key={t.id} className="relative pl-3 border-l-2 border-rose-100 py-1">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-[10px] sm:text-xs text-gray-800">{t.guestName}</p>
                            <span className="text-emerald-600 font-black text-[10px]">{formatCurrency(Number(t.amountOriginal))}</span>
                          </div>
                          <p className="text-[9px] text-gray-400 truncate">{t.gift.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kyc" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm text-center">
                {isApproved ? (
                  <div className="py-6 sm:py-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <ShieldCheck size={40} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">Identidade Verificada!</h2>
                    <p className="text-gray-500 mt-2 text-xs sm:text-sm font-bold">Conta liberada para todos os recursos.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                        <MailCheck size={28} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Ativação da Carteira</h2>
                    <div className="text-left space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100 text-[10px] sm:text-xs text-gray-600 font-medium leading-relaxed">
                        <p>O Asaas enviou um e-mail para você.</p>
                        <ul className="space-y-2 list-disc pl-4">
                            <li>Assunto: &quot;Acesse sua conta&quot; ou &quot;Redefinição de senha&quot;.</li>
                            <li>Defina sua senha no Asaas.</li>
                            <li>Envie documentos e selfie por lá.</li>
                        </ul>
                    </div>
                    <KYCButton />
                  </div>
                )}
              </div>
              <BankSettingsForm />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl p-1 shadow-sm border border-gray-100">
              <EventSettingsForm event={event} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value }: Omit<StatCardProps, 'description'>) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 flex flex-col gap-3 shadow-sm transition hover:shadow-md group">
      <div className="flex items-center gap-3">
        <div className={`p-2 sm:p-3 rounded-xl ${color} transition-transform group-hover:scale-105 shrink-0`}>{icon}</div>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      </div>
      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 truncate">{value}</h3>
    </div>
  )
}