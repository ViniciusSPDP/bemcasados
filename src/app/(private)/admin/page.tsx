import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { logoutAction } from "@/actions/auth";
import { deleteGift } from "@/actions/gift-actions";

// Componentes
import { GiftForm } from "@/components/private/admin/gift-form";
import { EventSettingsForm } from "@/components/private/admin/event-settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LayoutDashboard 
} from "lucide-react";

export const dynamic = "force-dynamic";
const isLocal = process.env.NODE_ENV === 'development';

interface StatCardProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    value: string;
}

export default async function AdminPage() {
    // 1. Verificação de Segurança
    const session = await verifySession();

    // 2. Busca de Dados do Evento
    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        // ADICIONE ISTO:
        include: { 
            galleryItems: {
                orderBy: { orderIndex: 'asc' }
            } 
        }
    });

    // Caso de borda: Usuário sem evento
    if (!event) {
        return (
            <div className="flex h-screen items-center justify-center p-6 flex-col gap-4">
                 <div className="text-center space-y-4">
                    <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
                    <h1 className="text-xl font-bold">Nenhum evento encontrado</h1>
                    <p className="text-gray-500">Parece que você tem uma conta, mas não criou um evento.</p>
                </div>
                <form action={logoutAction}>
                    <button className="text-rose-600 hover:text-rose-700 font-medium text-sm flex items-center gap-2">
                        <LogOut size={16} /> Sair da conta
                    </button>
                </form>
            </div>
        )
    }

    // 3. Busca de Métricas Financeiras
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

    const ticketMedio = totalGiftsSold > 0
        ? Number(totalReceived._sum.amountOriginal || 0) / totalGiftsSold
        : 0;

    return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER: Título + Botão de Logout + Link */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm md:bg-transparent md:border-0 md:shadow-none md:p-0">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Olá, {event.coupleName}</h1>
                <p className="text-sm md:text-base text-gray-500">
                    Gerencie o casamento: <span className="font-semibold text-rose-600">{event.title}</span>
                </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                 <div className="text-left md:text-right grow md:grow-0">
                    <p className="text-xs text-gray-400">Link do site:</p>
                    <a 
                        href={`/${event.slug}`} 
                        target="_blank" 
                        className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline break-all"
                    >
                        bemcasados.com/{event.slug}
                    </a>
                </div>
                
                <form action={logoutAction}>
                    <button 
                        type="submit" 
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition"
                    >
                        <LogOut size={16} /> 
                        <span className="hidden md:inline">Sair</span>
                    </button>
                </form>
            </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS */}
        <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-100 mb-6 mx-auto md:mx-0">
                <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:text-rose-600">
                    <LayoutDashboard size={16}/> Painel
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:text-rose-600">
                    <Settings size={16}/> Personalizar Site
                </TabsTrigger>
            </TabsList>

            {/* ABA 1: DASHBOARD (Financeiro e Presentes) */}
            <TabsContent value="dashboard" className="space-y-8 animate-in fade-in duration-300">
                 
                 {/* KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard 
                        icon={<DollarSign size={24} />} 
                        color="text-green-600 bg-green-100" 
                        label="Arrecadado" 
                        value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(totalReceived._sum.amountOriginal || 0))} 
                    />
                    <StatCard 
                        icon={<Gift size={24} />} 
                        color="text-rose-600 bg-rose-100" 
                        label="Presentes Vendidos" 
                        value={totalGiftsSold.toString()} 
                    />
                    <StatCard 
                        icon={<TrendingUp size={24} />} 
                        color="text-blue-600 bg-blue-100" 
                        label="Ticket Médio" 
                        value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ticketMedio)} 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coluna Esquerda: Formulário e Lista */}
                    <div className="space-y-8">
                        <GiftForm />

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-800">Presentes Cadastrados</h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                    {gifts.length} itens
                                </span>
                            </div>
                             
                             {gifts.length === 0 ? (
                                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                                    <Gift className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">Nenhum presente cadastrado.</p>
                                  </div>
                              ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                    {gifts.map((gift) => (
                                    <div key={gift.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden relative border border-gray-200 shrink-0">
                                                {gift.imageUrl ? (
                                                    <Image 
                                                        src={gift.imageUrl} 
                                                        alt={gift.title} 
                                                        fill 
                                                        className="object-cover" 
                                                        sizes="48px" 
                                                        unoptimized={isLocal} 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <Gift size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm line-clamp-1">{gift.title}</p>
                                                <p className="text-xs text-gray-500 font-mono">
                                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(gift.price))}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <form action={deleteGift.bind(null, gift.id)}>
                                            <button 
                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                                                title="Excluir presente"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </form>
                                    </div>
                                    ))}
                                </div>
                              )}
                        </div>
                    </div>

                    {/* Coluna Direita: Extrato de Transações */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Últimas Vendas</h2>
                        
                        {recentTransactions.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <DollarSign className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">Nenhuma venda realizada ainda.</p>
                                <p className="text-xs mt-1">Divulgue seu link!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {recentTransactions.map((t) => (
                                <div key={t.id} className="py-4 first:pt-0 last:pb-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-gray-800 text-sm">{t.guestName || "Anônimo"}</p>
                                        <span className="text-green-700 font-bold text-xs bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(t.amountOriginal))}
                                        </span>
                                    </div>
                                    <p className="text-xs text-rose-600 mb-1 font-medium flex items-center gap-1">
                                        <Gift size={10} /> {t.gift.title}
                                    </p>
                                    {t.message && (
                                        <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 italic border border-gray-100 mt-2">
                                            &quot;{t.message}&quot;
                                        </div>
                                    )}
                                </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </TabsContent>

            {/* ABA 2: CONFIGURAÇÕES (Stories, Fotos, Textos) */}
            <TabsContent value="settings" className="animate-in fade-in duration-300">
                <div className="max-w-4xl mx-auto">
                    <EventSettingsForm event={event} />
                </div>
            </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

// Componente Auxiliar para Cards de KPI
function StatCard({ icon, color, label, value }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
            <div className={`p-3 rounded-full ${color}`}>{icon}</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{label}</p>
              <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{value}</h3>
            </div>
        </div>
    )
}