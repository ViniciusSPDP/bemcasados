import { prisma } from "@/lib/prisma";
import { GiftForm } from "@/components/private/admin/gift-form";
import { deleteGift } from "@/actions/gift-actions";
import { logoutAction } from "@/actions/auth"; // <--- Importe a ação
import { Trash2, DollarSign, Gift, TrendingUp, AlertCircle, LogOut } from "lucide-react"; // <--- Importe LogOut
import Image from "next/image";
import { verifySession } from "@/lib/dal";

export const dynamic = "force-dynamic";
const isLocal = process.env.NODE_ENV === 'development';

interface StatCardProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    value: string;
}

export default async function AdminPage() {
    const session = await verifySession();

    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        include: { gifts: true }
    });

    if (!event) {
        return (
            <div className="flex h-screen items-center justify-center p-6 flex-col gap-4">
                 <div className="text-center space-y-4">
                    <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
                    <h1 className="text-xl font-bold">Nenhum evento encontrado</h1>
                    <p className="text-gray-500">Parece que você tem uma conta, mas não criou um evento.</p>
                </div>
                {/* Botão de Sair caso não tenha evento */}
                <form action={logoutAction}>
                    <button className="text-rose-600 hover:text-rose-700 font-medium text-sm flex items-center gap-2">
                        <LogOut size={16} /> Sair da conta
                    </button>
                </form>
            </div>
        )
    }

    // Métricas
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Personalizado com Botão de Logout */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Olá, {event.coupleName}</h1>
                <p className="text-gray-500">Gerencie o casamento: <span className="font-semibold">{event.title}</span></p>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400">Seu link personalizado:</p>
                    <a href={`/${event.slug}`} target="_blank" className="text-sm font-medium text-rose-600 hover:underline">
                        bemcasados.com/{event.slug}
                    </a>
                </div>

                {/* BOTÃO DE SAIR */}
                <form action={logoutAction}>
                    <button 
                        type="submit" 
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition shadow-sm"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                </form>
            </div>
        </div>

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
          {/* Esquerda: Form + Lista (Código igual ao anterior) */}
          <div className="space-y-8">
            <GiftForm />

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Presentes Cadastrados</h2>
              {gifts.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhum presente cadastrado ainda.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {gifts.map((gift) => (
                    <div key={gift.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden relative">
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
                                <div className="w-full h-full bg-gray-300" />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">{gift.title}</p>
                            <p className="text-sm text-gray-500">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(gift.price))}
                            </p>
                        </div>
                        </div>
                        
                        <form action={deleteGift.bind(null, gift.id)}>
                        <button className="text-red-400 hover:text-red-600 p-2 transition">
                            <Trash2 size={18} />
                        </button>
                        </form>
                    </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Direita: Transações (Código igual ao anterior) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Últimas Vendas</h2>
            {recentTransactions.length === 0 ? (
               <p className="text-gray-400 text-sm py-4">Nenhuma venda ainda.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="py-4">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-gray-800">{t.guestName}</p>
                      <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full">
                         {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(t.amountOriginal))}
                      </span>
                    </div>
                    <p className="text-sm text-rose-600 mb-1">🎁 {t.gift.title}</p>
                    {t.message && <p className="text-sm text-gray-500 italic">&quot;{t.message}&quot;</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-full ${color}`}>{icon}</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
            </div>
        </div>
    )
}