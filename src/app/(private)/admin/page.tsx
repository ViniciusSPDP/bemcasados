import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { logoutAction } from "@/actions/auth";
import { deleteGift } from "@/actions/gift-actions";
import { mediaUrl } from "@/lib/media";

// Componentes
import { GiftForm } from "@/components/private/admin/gift-form";
import { EventSettingsForm } from "@/components/private/admin/event-settings-form";
import { ExternalGiftForm } from "@/components/private/admin/external-gift-form";
import { ExternalGiftAdminList } from "@/components/private/admin/external-gift-admin-list";
import { ExternalGiftImport } from "@/components/private/admin/external-gift-import";
import { RsvpList } from "@/components/private/admin/rsvp-list";
import { toAdminRsvp } from "@/lib/rsvp";
import { InviteSettingsForm } from "@/components/private/admin/invite-settings-form";
import { AccountSettingsForm } from "@/components/private/admin/account-settings-form";
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
  LayoutDashboard,
  ExternalLink,
  Heart,
  ShoppingBag,
  ScrollText,
  UserCog,
  Users
} from "lucide-react";

export const dynamic = "force-dynamic";

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
    //
    // `select` explícito em vez de trazer a linha inteira: este objeto é
    // repassado para <EventSettingsForm>, que é Client Component, então tudo o
    // que vier aqui é serializado para o HTML. `asaasApiKey` e `walletId` são
    // credenciais de pagamento do casal e ficam de fora.
    const event = await prisma.event.findFirst({
        where: { userId: session.userId },
        select: {
            id: true,
            slug: true,
            title: true,
            coupleName: true,
            eventDate: true,
            // Só nome e e-mail: o hash da senha nunca sai do servidor.
            user: { select: { name: true, email: true } },
            introTitle: true,
            introSubtitle: true,
            welcomeMessage: true,
            videoUrl: true,
            monogram: true,
            inviteVerse: true,
            ceremonyTime: true,
            ceremonyVenue: true,
            ceremonyAddress: true,
            ceremonyMapsUrl: true,
            inviteImageUrl: true,
            galleryItems: {
                orderBy: { orderIndex: 'asc' }
            }
        }
    });

    // Caso de borda: Usuário sem evento
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

    const gifts = (await prisma.gift.findMany({
        where: { eventId: event.id },
        orderBy: { createdAt: "desc" },
    })).map((gift) => ({ ...gift, imageUrl: mediaUrl(gift.imageUrl) }));

    // Aqui os dados de quem reservou SÃO carregados de propósito: esta tela é do
    // casal e é o único lugar onde o nome e o telefone do convidado aparecem.
    const externalGifts = (await prisma.externalGift.findMany({
        where: { eventId: event.id },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }],
        select: {
            id: true,
            title: true,
            imageUrl: true,
            shortUrl: true,
            reservedAt: true,
            reservedName: true,
            reservedPhone: true,
            reservedMessage: true,
        },
    })).map((item) => ({ ...item, imageUrl: mediaUrl(item.imageUrl) }));

    // A lista de presenças existe SÓ aqui. Nenhuma página pública a consulta —
    // nem o convite, que é de onde o convidado responde. `toAdminRsvp` é a
    // segunda trava: ela fixa o que atravessa a fronteira para o Client
    // Component, e o `eventId` fica de fora.
    const rsvps = (await prisma.rsvp.findMany({
        where: { eventId: event.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            message: true,
            companions: true,
            createdAt: true,
        },
    })).map(toAdminRsvp);

    const ticketMedio = totalGiftsSold > 0
        ? Number(totalReceived._sum.amountOriginal || 0) / totalGiftsSold
        : 0;

    return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
      {/* BACKGROUND DECORATIVO NO TOPO */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* LADO ESQUERDO: SAUDAÇÃO */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                        <Heart className="text-rose-600 w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                            Olá, {event.coupleName.split(' ')[0]}
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
                            Evento Ativo
                        </p>
                    </div>
                </div>
                
                {/* LADO DIREITO: AÇÕES */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                     <a 
                        href={`/${event.slug}`} 
                        target="_blank" 
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors"
                    >
                        <ExternalLink size={16} /> 
                        <span className="hidden sm:inline">Ver Site</span>
                    </a>
                    
                    <form action={logoutAction}>
                        <button 
                            type="submit" 
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sair"
                        >
                            <LogOut size={18} />
                        </button>
                    </form>
                </div>
            </div>
          </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* NAVEGAÇÃO POR ABAS */}
        <Tabs defaultValue="dashboard" className="w-full">
            <div className="flex justify-center md:justify-start mb-6">
                <TabsList className="bg-white border border-gray-200 p-1 rounded-xl h-auto shadow-sm">
                    <TabsTrigger 
                        value="dashboard" 
                        className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
                    >
                        <LayoutDashboard size={18}/> Painel
                    </TabsTrigger>
                    <TabsTrigger
                        value="convite"
                        className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
                    >
                        <ScrollText size={18}/> Convite
                    </TabsTrigger>
                    <TabsTrigger
                        value="presencas"
                        className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
                    >
                        <Users size={18}/> Presenças
                    </TabsTrigger>
                    <TabsTrigger
                        value="vitrine"
                        className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
                    >
                        <ShoppingBag size={18}/> Vitrine
                    </TabsTrigger>
                    <TabsTrigger
                        value="settings"
                        className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
                    >
                        <Settings size={18}/> Personalizar
                    </TabsTrigger>
                    <TabsTrigger
                        value="conta"
                        className="px-6 py-2.5 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2 text-gray-600"
                    >
                        <UserCog size={18}/> Conta
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* ABA 1: DASHBOARD (Financeiro e Presentes) */}
            <TabsContent value="dashboard" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                 {/* KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <StatCard 
                        icon={<DollarSign size={24} />} 
                        color="text-emerald-600 bg-emerald-100" 
                        label="Total Arrecadado" 
                        value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(totalReceived._sum.amountOriginal || 0))} 
                    />
                    <StatCard 
                        icon={<Gift size={24} />} 
                        color="text-rose-600 bg-rose-100" 
                        label="Presentes Recebidos" 
                        value={totalGiftsSold.toString()} 
                    />
                    <StatCard 
                        icon={<TrendingUp size={24} />} 
                        color="text-blue-600 bg-blue-100" 
                        label="Ticket Médio" 
                        value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ticketMedio)} 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Coluna Esquerda: Formulário e Lista (Ocupa 7/12 no desktop) */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* Componente de Adicionar Presente */}
                        <GiftForm />

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Gift className="text-rose-500" size={20}/>
                                    Seus Presentes
                                </h2>
                                <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">
                                    {gifts.length} cadastrados
                                </span>
                            </div>
                             
                             {gifts.length === 0 ? (
                                  <div className="text-center py-12 px-6">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Gift className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-gray-900 font-medium">Nenhum presente ainda</h3>
                                    <p className="text-sm text-gray-500 mt-1">Cadastre opções para seus convidados escolherem.</p>
                                  </div>
                              ) : (
                                <div className="divide-y divide-gray-100 max-h-150 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                    {gifts.map((gift) => (
                                    <div key={gift.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 group">
                                        {/* Imagem do Presente */}
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-100 shrink-0 shadow-sm">
                                            {gift.imageUrl ? (
                                                <Image 
                                                    src={gift.imageUrl} 
                                                    alt={gift.title} 
                                                    fill 
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    sizes="80px"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <Gift size={24} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info do Presente */}
                                        <div className="flex-1 min-w-0 py-1">
                                            <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate pr-2">
                                                {gift.title}
                                            </h3>
                                            <p className="text-rose-600 font-bold text-sm md:text-base mt-1">
                                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(gift.price))}
                                            </p>
                                        </div>
                                        
                                        {/* Ações */}
                                        <form action={deleteGift.bind(null, gift.id)}>
                                            <button 
                                                className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all"
                                                title="Excluir presente"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </form>
                                    </div>
                                    ))}
                                </div>
                              )}
                        </div>
                    </div>

                    {/* Coluna Direita: Extrato (Ocupa 5/12 no desktop) */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-800">Últimas Vendas</h2>
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md font-medium border border-green-100">
                                    Extrato
                                </span>
                            </div>
                            
                            {recentTransactions.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <DollarSign className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium">Nenhuma venda realizada.</p>
                                    <p className="text-xs text-gray-400 mt-1">Compartilhe seu link para começar!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentTransactions.map((t) => (
                                    <div key={t.id} className="relative pl-4 border-l-2 border-rose-100 py-1 hover:border-rose-400 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-bold text-gray-900 text-sm truncate max-w-[60%]">
                                                {t.guestName || "Convidado Anônimo"}
                                            </p>
                                            <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded-md">
                                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(t.amountOriginal))}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                            Comprou: <span className="text-gray-700 font-medium">{t.gift.title}</span>
                                        </p>
                                        
                                        {t.message && (
                                            <div className="bg-rose-50/50 p-3 rounded-lg text-xs text-rose-800 italic relative">
                                                <span className="absolute -top-2 left-2 text-rose-200 text-xl font-serif">“</span>
                                                {t.message}
                                            </div>
                                        )}
                                    </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </TabsContent>

            {/* ABA 2: CONVITE (a página que o casal manda aos convidados) */}
            <TabsContent value="convite" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-3xl mx-auto">
                    {/*
                      Campos listados um a um em vez de espalhar `event`: este é
                      um Client Component, e o objeto do evento carrega junto os
                      dados da conta (`user.email`), que não têm o que fazer no
                      HTML desta aba. A chave da imagem vira `/api/media/...`
                      aqui, na borda de renderização.
                    */}
                    <InviteSettingsForm
                        event={{
                            slug: event.slug,
                            monogram: event.monogram,
                            inviteVerse: event.inviteVerse,
                            ceremonyTime: event.ceremonyTime,
                            ceremonyVenue: event.ceremonyVenue,
                            ceremonyAddress: event.ceremonyAddress,
                            ceremonyMapsUrl: event.ceremonyMapsUrl,
                            inviteImageUrl: mediaUrl(event.inviteImageUrl),
                        }}
                    />
                </div>
            </TabsContent>

            {/* ABA 3: PRESENÇAS (quem confirmou pelo convite) */}
            <TabsContent value="presencas" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-lg font-bold text-gray-800">Confirmações de presença</h2>
                        <a
                            href={`/${event.slug}/convite`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                        >
                            Ver o convite <ExternalLink size={14} />
                        </a>
                    </div>
                    <RsvpList rsvps={rsvps} slug={event.slug} />
                </div>
            </TabsContent>

            {/* ABA 4: VITRINE (presentes comprados fora, no Mercado Livre) */}
            <TabsContent value="vitrine" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 space-y-6">
                        <ExternalGiftForm />
                        <ExternalGiftImport />
                    </div>
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-baseline justify-between">
                            <h2 className="text-lg font-bold text-gray-800">Itens da vitrine</h2>
                            <a
                                href={`/${event.slug}/vitrine`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                            >
                                Ver a página <ExternalLink size={14} />
                            </a>
                        </div>
                        <ExternalGiftAdminList items={externalGifts} />
                    </div>
                </div>
            </TabsContent>

            {/* ABA 5: CONTA (dados do casamento, endereço, e-mail e senha) */}
            <TabsContent value="conta" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-3xl mx-auto">
                    <AccountSettingsForm
                        data={{
                            coupleName: event.coupleName,
                            title: event.title,
                            // `Date` não atravessa a fronteira para o Client Component.
                            eventDate: event.eventDate.toISOString(),
                            slug: event.slug,
                            userName: event.user.name,
                            userEmail: event.user.email,
                        }}
                    />
                </div>
            </TabsContent>

            {/* ABA 4: CONFIGURAÇÕES (Stories, Fotos, Textos) */}
            <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-3xl mx-auto">
                    {/* Idem: só os campos que este formulário edita. */}
                    <EventSettingsForm
                        event={{
                            introTitle: event.introTitle,
                            introSubtitle: event.introSubtitle,
                            welcomeMessage: event.welcomeMessage,
                            videoUrl: event.videoUrl,
                            galleryItems: event.galleryItems,
                        }}
                    />
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
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 transition hover:shadow-md hover:border-rose-100 group">
            <div className={`p-4 rounded-2xl ${color} group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight mt-1">{value}</h3>
            </div>
        </div>
    )
}