import { prisma } from "@/lib/prisma";
import { GiftForm } from "@/components/private/admin/gift-form";
import { deleteGift } from "@/actions/gift-actions";
import { Trash2, DollarSign, Gift, TrendingUp } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";
const isLocal = process.env.NODE_ENV === 'development';

interface StatCardProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    value: string;
}

export default async function AdminPage() {

    const totalReceived = await prisma.transaction.aggregate({
        where: { status: "PAID"},
        _sum: { amountOriginal: true },
    })

    const totalGiftsSold = await prisma.transaction.count({
        where: { status: "PAID"},
    })

    const recentTransactions = await prisma.transaction.findMany({
        where: { status: "PAID"},
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { gift: true },
    });

    const gifts = await prisma.gift.findMany({
        orderBy: { createdAt: "desc" },
    });

    const ticketMedio = totalGiftsSold > 0
        ? Number(totalReceived._sum.amountOriginal || 0) / totalGiftsSold
        : 0;

    return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Visão geral do casamento.</p>
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
          
          {/* Esquerda: Form + Lista */}
          <div className="space-y-8">
            <GiftForm />

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Presentes Cadastrados</h2>
              <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
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
                            sizes="(max-width: 768px) 100vw, 48px"
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
                    {/* Botão de Delete usando Server Action direta */}
                    <form action={deleteGift.bind(null, gift.id)}>
                      <button className="text-red-400 hover:text-red-600 p-2 transition">
                        <Trash2 size={18} />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Direita: Transações */}
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

// Pequeno componente local apenas para organizar os cards
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