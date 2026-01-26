// src/app/(private)/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { logoutAction } from "@/actions/auth";
import { deleteGift } from "@/actions/gift-actions";
import { getAsaasBalance, getAsaasTransferHistory } from "@/services/asaas";

// Componentes
import { GiftForm } from "@/components/private/admin/gift-form";
import { EventSettingsForm } from "@/components/private/admin/event-settings-form";
import { AsaasOnboardingForm } from "@/components/private/admin/asaas-onboarding-form";
import { BankSettingsForm } from "@/components/private/admin/bank-settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WithdrawButton } from "@/components/private/admin/withdraw-button";
import Image from "next/image";

// Ícones - ADICIONADO 'Layers' E 'ChevronRight' NA LISTA
import {
  Trash2,
  DollarSign,
  Gift,
  TrendingUp,
  LogOut,
  Settings,
  LayoutDashboard,
  ExternalLink,
  Heart,
  FileCheck,
  ShieldCheck,
  Wallet,
  Clock,
  MailCheck,
  Layers} from "lucide-react";

export const dynamic = "force-dynamic";


export default async function AdminPage() {
  const session = await verifySession();

  const event = await prisma.event.findFirst({
    where: { userId: session.userId },
    include: { galleryItems: { orderBy: { orderIndex: 'asc' } } }
  });

  // 1. Caso não tenha evento
  if (!event) {
    return (
      <div className="flex h-screen items-center justify-center p-6 bg-rose-50/30">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6 max-w-sm border border-rose-100">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Heart className="h-10 w-10 text-rose-500" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Crie seu Evento</h1>
          <p className="text-gray-500 text-sm font-medium">Você ainda não possui um evento ativo em nossa plataforma.</p>
          <form action={logoutAction}>
            <button className="w-full py-4 px-4 bg-gray-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
              <LogOut size={18} /> Sair da Conta
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Caso não tenha configurado Asaas
  if (!event.walletId || !event.asaasApiKey) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="inline-flex p-5 bg-rose-600 rounded-[2rem] text-white shadow-2xl shadow-rose-200 mb-6">
              <Wallet size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-900">Configuração Financeira</h1>
            <p className="text-gray-500 mt-2 font-medium">Ative sua carteira para começar a receber presentes em dinheiro.</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
             <AsaasOnboardingForm />
          </div>
        </div>
      </div>
    );
  }

  // 3. Busca dados financeiros
  const isApproved = event.isApproved; 
  const [availableBalance] = await Promise.all([
    getAsaasBalance(event.asaasApiKey),
    getAsaasTransferHistory(event.asaasApiKey)
  ]);

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
    <div className="min-h-screen bg-[#FDFDFF] pb-24 font-sans selection:bg-rose-100">
      
      {/* HEADER ULTRA MOBILE */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <Heart className="text-white w-6 h-6" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-none">Painel do Casal</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${isApproved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {isApproved ? 'Conta Verificada' : 'Pendente de Analise'}
                </span>
              </div>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-rose-600 transition-colors">
              <LogOut size={22} />
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 pt-6 space-y-8">
        
        <Tabs defaultValue="dashboard" className="w-full">
          {/* TAB LIST ESTILIZADA COMO APP */}
          <div className="flex justify-center mb-8">
            <TabsList className="bg-gray-100/50 p-1.5 rounded-[1.8rem] h-auto border border-gray-200/50 shadow-inner">
              <TabsTrigger value="dashboard" className="px-6 py-3 rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-xl flex items-center gap-2 text-xs font-black transition-all">
                <LayoutDashboard size={18}/> RESUMO
              </TabsTrigger>
              <TabsTrigger value="settings" className="px-6 py-3 rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-xl flex items-center gap-2 text-xs font-black transition-all">
                <Settings size={18}/> SITE
              </TabsTrigger>
              <TabsTrigger value="kyc" className="px-6 py-3 rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-xl flex items-center gap-2 text-xs font-black transition-all">
                <FileCheck size={18}/> CONTA
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 mt-0">
            
            {/* CARD DE SALDO PRINCIPAL */}
            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-200">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Wallet size={120} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-xl"><DollarSign size={20} className="text-rose-400" /></div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Saldo Disponível</span>
                </div>
                <h2 className="text-4xl font-black tracking-tighter">{formatCurrency(availableBalance)}</h2>
                <div className="pt-4">
                  <WithdrawButton balance={availableBalance} isApproved={isApproved} />
                </div>
                <p className="text-[10px] text-gray-500 font-bold flex items-center gap-2">
                   <Clock size={12} /> Transferências via PIX caem na hora.
                </p>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 w-fit rounded-xl"><TrendingUp size={20}/></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bruto</span>
                <span className="text-lg font-black text-gray-900">{formatCurrency(Number(totalReceived._sum.amountOriginal || 0))}</span>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 w-fit rounded-xl"><Gift size={20}/></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Presentes</span>
                <span className="text-lg font-black text-gray-900">{totalGiftsSold}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7">
                 <GiftForm isApproved={isApproved} eventId={event.id} asaasApiKey={event.asaasApiKey} />
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <Layers size={18} className="text-rose-500" /> Meus Itens
                    </h2>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{gifts.length} total</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-100 overflow-y-auto px-2">
                    {gifts.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <Gift className="mx-auto text-gray-200" size={40} />
                        <p className="text-xs text-gray-400 font-bold uppercase">Sua lista está vazia</p>
                      </div>
                    ) : (
                      gifts.map((gift) => (
                        <div key={gift.id} className="p-4 flex items-center gap-4 group">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden relative shrink-0 shadow-sm border border-gray-100">
                            {gift.imageUrl && <Image src={gift.imageUrl} alt="" fill className="object-cover" unoptimized />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-xs truncate">{gift.title}</h3>
                            <p className="text-rose-600 font-black text-[11px] mt-0.5">{formatCurrency(Number(gift.price))}</p>
                          </div>
                          <form action={deleteGift.bind(null, gift.id)}>
                            <button className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90">
                              <Trash2 size={16} />
                            </button>
                          </form>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                  <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" size={18} /> Vendas
                  </h2>
                  <div className="space-y-4">
                    {recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-sm font-black text-[10px]">
                            {t.guestName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[11px] text-gray-900 leading-tight">{t.guestName}</p>
                            <p className="text-[9px] text-gray-400 font-medium truncate max-w-30">{t.gift.title}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-600">+{formatCurrency(Number(t.amountOriginal))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kyc" className="animate-in fade-in duration-500 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                {isApproved ? (
                  <div className="py-10">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <ShieldCheck size={48} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Tudo Pronto!</h2>
                    <p className="text-gray-500 mt-3 font-medium text-sm">Sua identidade foi verificada e sua conta está 100% liberada.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[2rem] flex items-center justify-center mx-auto">
                        <MailCheck size={36} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-gray-900">Aprovação Necessária</h2>
                        <p className="text-sm text-gray-500 font-medium">Siga os passos abaixo para liberar seus saques.</p>
                    </div>
                    <div className="text-left space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <div className="flex gap-4">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200 shrink-0">1</div>
                            <p className="text-xs text-gray-600 leading-relaxed font-medium">Abra o e-mail enviado pelo <strong>Asaas</strong> e defina sua senha.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200 shrink-0">2</div>
                            <p className="text-xs text-gray-600 leading-relaxed font-medium">Acesse o painel oficial e envie sua <strong>Selfie + Documento</strong>.</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <a href="https://www.asaas.com" target="_blank" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                            Acessar Painel Asaas <ExternalLink size={16}/>
                        </a>
                    </div>
                  </div>
                )}
              </div>
              <BankSettingsForm />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="animate-in fade-in duration-500 mt-0">
             <div className="bg-white rounded-[2.5rem] p-2 border border-gray-100 shadow-sm">
                <EventSettingsForm event={event} />
             </div>
          </TabsContent>
        </Tabs>
      </div>

      <a href={`/${event.slug}`} target="_blank" className="fixed bottom-6 right-6 p-4 bg-rose-600 text-white rounded-full shadow-2xl shadow-rose-300 z-50 active:scale-90 transition-all">
        <ExternalLink size={24} />
      </a>

    </div>
  );
}