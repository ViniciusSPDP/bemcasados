'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Gift, Heart, ShieldCheck, 
  Smartphone, Wallet, Sparkles, CheckCircle2,
  Menu, Lock, ExternalLink, TrendingUp, Scan
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { motion, Variants } from "framer-motion";

// --- VARIÁVEIS DE ANIMAÇÃO ---
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: "easeOut" } 
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden selection:bg-rose-100 selection:text-rose-900">
      
      {/* --- BANNER DE FILA DE ESPERA --- */}
      <div className="bg-gray-900 text-white text-[10px] sm:text-xs py-2 px-4 text-center font-medium tracking-wide relative z-50">
        <span className="inline-flex items-center gap-2">
          <Sparkles size={12} className="text-amber-400" />
          Fila de Espera Ativa: Aceitando apenas contas verificadas no Asaas.
        </span>
      </div>

      {/* --- HEADER RESPONSIVO --- */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* LOGO */}
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 p-1.5 rounded-lg shadow-sm shadow-rose-200">
                <Gift className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight">BemCasados</span>
          </div>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#como-funciona" className="text-sm font-bold text-gray-500 hover:text-rose-600 transition-colors">Como Funciona</Link>
            <Link href="#qrcode" className="text-sm font-bold text-gray-500 hover:text-rose-600 transition-colors">Personalização</Link>
            <Link href="#faq" className="text-sm font-bold text-gray-500 hover:text-rose-600 transition-colors">Dúvidas</Link>
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="hidden md:block text-sm font-bold text-gray-500 hover:text-rose-600 transition px-2">
              Entrar
            </Link>
            
            <Link href="/register">
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-4 sm:px-6 shadow-md shadow-rose-200 text-xs sm:text-sm font-bold transition-transform hover:scale-105">
                Criar Lista Grátis
              </Button>
            </Link>
            
            {/* Menu Mobile */}
            <div className="md:hidden ml-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-rose-50 hover:text-rose-600">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] z-50">
                  <SheetHeader className="text-left mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-rose-600 p-1.5 rounded-lg">
                            <Gift className="text-white w-4 h-4" />
                        </div>
                        <SheetTitle>BemCasados</SheetTitle>
                    </div>
                    <SheetDescription>
                        Gerencie sua lista de casamento.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <nav className="flex flex-col gap-4">
                    <SheetClose asChild>
                        <Link href="#como-funciona" className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-900 font-bold transition-colors">
                            <Smartphone className="w-5 h-5 text-rose-500" /> Como Funciona
                        </Link>
                    </SheetClose>
                    <SheetClose asChild>
                        <Link href="#qrcode" className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-900 font-bold transition-colors">
                            <Scan className="w-5 h-5 text-rose-500" /> Personalização
                        </Link>
                    </SheetClose>
                    <div className="h-px bg-gray-100 my-2" />
                    
                    <SheetClose asChild>
                        <Link href="/login" className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-500 font-bold transition-colors">
                            <Lock className="w-5 h-5 text-gray-400" /> Entrar na Conta
                        </Link>
                    </SheetClose>
                    
                    <SheetClose asChild>
                        <Link href="/register">
                            <Button className="w-full bg-rose-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-rose-200">
                                Criar Conta Grátis
                            </Button>
                        </Link>
                    </SheetClose>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* --- HERO SECTION --- */}
        <section className="relative py-12 sm:py-20 lg:py-32 overflow-hidden px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-rose-100/40 via-white to-orange-50/40 -z-10 pointer-events-none" />
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 border border-rose-100">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> Novo: Stories Animados
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.15] sm:leading-[1.1]">
              Sua lista de presentes <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500">
                convertida em dinheiro
              </span>.
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-base sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed px-2 font-medium">
              Crie um site emocionante. Receba o valor de cada presente direto na sua conta Asaas via PIX. Sem intermediários, você tem o controle.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 px-4 sm:px-0">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-12 sm:h-14 text-base sm:text-lg rounded-full bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-200 font-bold transition-all hover:scale-105 active:scale-95">
                  Começar Minha Lista <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              
              <a href="https://bemcasadosapp.com.br/casamento-principal" target="_blank" className="w-full sm:w-auto inline-block">
                 <Button variant="outline" size="lg" className="w-full h-12 sm:h-14 text-base sm:text-lg rounded-full border-gray-200 hover:bg-gray-50 text-gray-600 bg-white font-bold gap-2">
                  <ExternalLink size={18} /> Ver Exemplo Real
                </Button>
              </a>
            </motion.div>
            <motion.p variants={fadeInUp} className="text-[10px] sm:text-xs text-gray-400 font-bold">
              * Necessário possuir conta no Asaas para recebimentos.
            </motion.p>
          </motion.div>
        </section>

        {/* --- TRANSPARÊNCIA FINANCEIRA --- */}
        <section id="transparencia" className="py-16 sm:py-24 bg-white px-4 border-y border-gray-100">
            <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="max-w-5xl mx-auto"
            >
                <motion.div variants={fadeInUp} className="text-center mb-12">
                    <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">Matemática a seu Favor</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        Nosso sistema foi desenhado para que você receba o valor integral do presente. 
                        As taxas são repassadas para o convidado de forma inteligente.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 items-center">
                    {/* Card Exemplo */}
                    <motion.div variants={fadeInUp} className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 bg-rose-100 text-rose-600 px-4 py-2 rounded-bl-2xl font-bold text-xs uppercase tracking-wider">
                            Exemplo Real
                        </div>
                        
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-center pb-4 border-b border-gray-200 border-dashed">
                                <div>
                                    <p className="text-sm text-gray-500 font-bold uppercase">Valor do Presente</p>
                                    <p className="text-2xl font-black text-gray-900">R$ 100,00</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 font-bold uppercase">Você Recebe</p>
                                    <p className="text-2xl font-black text-emerald-600">R$ 100,00*</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">O que o convidado paga:</span>
                                    <span className="font-bold text-gray-900">R$ 104,90</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>(-) Taxa Asaas (Gateway)</span>
                                    <span>Variável</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>(-) Manutenção Plataforma</span>
                                    <span>1%</span>
                                </div>
                            </div>
                            
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3 items-start">
                                <TrendingUp className="text-emerald-600 w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-700">A &quot;Gordurinha&quot; é sua!</p>
                                    <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                                        Nós arredondamos o valor para um &quot;número bonito&quot; (ex: ,90). Se o Asaas tiver promoções de taxas reduzidas, a diferença sobra como lucro extra para você.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card Benefícios Asaas */}
                    <motion.div variants={fadeInUp} className="space-y-6 px-4">
                        <h3 className="text-xl font-bold text-gray-900">Por que conectar com Asaas?</h3>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="bg-rose-50 p-2 rounded-lg text-rose-600 shrink-0 h-fit">
                                    <Lock size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Segurança Total</h4>
                                    <p className="text-sm text-gray-500">O dinheiro não passa por nós. Vai direto para sua conta digital.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="bg-rose-50 p-2 rounded-lg text-rose-600 shrink-0 h-fit">
                                    <Wallet size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Configuração Simples</h4>
                                    <p className="text-sm text-gray-500">Depois de criar sua conta no Asaas, basta colar a chave API e pronto. Tudo automático.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="bg-rose-50 p-2 rounded-lg text-rose-600 shrink-0 h-fit">
                                    <TrendingUp size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Aproveite as Promoções</h4>
                                    <p className="text-sm text-gray-500">O Asaas frequentemente reduz taxas de PIX. Isso significa mais dinheiro líquido para o casal.</p>
                                </div>
                            </li>
                        </ul>
                    </motion.div>
                </div>
            </motion.div>
        </section>

        {/* --- COMO FUNCIONA --- */}
        <section id="como-funciona" className="py-16 sm:py-24 bg-gray-50/50 px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="max-w-6xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 px-4 tracking-tight">Comece em 3 passos</h2>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <StepCard 
                number="01"
                icon={<Smartphone className="w-6 h-6" />}
                title="Crie seu site"
                description="Adicione fotos, a história de vocês e escolha os presentes da nossa lista sugerida ou crie novos."
              />
              <StepCard 
                number="02"
                icon={<Heart className="w-6 h-6" />}
                title="Compartilhe"
                description="Envie o link personalizado (ex: /ana-e-pedro) para seus convidados."
              />
              <StepCard 
                number="03"
                icon={<Wallet className="w-6 h-6" />}
                title="Receba o valor"
                description="O dinheiro cai na sua conta Asaas e você transfere para onde quiser."
              />
            </div>
          </motion.div>
        </section>

        {/* --- NOVA SEÇÃO: QR CODE REAL & PERSONALIZAÇÃO --- */}
        <section id="qrcode" className="py-16 sm:py-24 bg-white px-4">
            <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="max-w-5xl mx-auto"
            >
                <div className="bg-gray-900 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-12 text-white shadow-2xl shadow-gray-200">
                    {/* Decoração de fundo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />

                    <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-rose-300 border border-white/10">
                            <Scan size={14} /> Identidade Única
                        </motion.div>
                        <motion.h2 variants={fadeInUp} className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                            QR Code e Link <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300">
                                100% Personalizados
                            </span>
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-gray-300 text-lg leading-relaxed max-w-lg mx-auto md:mx-0 font-medium">
                            Não é só uma lista. É o site do seu casamento. Gere um QR Code automático para colocar no convite e deixe tudo com a cara de vocês: fotos, cores e mensagens.
                        </motion.p>
                        <motion.div variants={fadeInUp} className="pt-4 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                             <a href="https://bemcasadosapp.com.br/casamento-principal" target="_blank" className="inline-block w-full sm:w-auto">
                                <Button className="bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-xl h-12 px-8 shadow-lg w-full sm:w-auto transition-transform hover:scale-105">
                                    Ver Exemplo Real <ExternalLink size={16} className="ml-2 text-rose-500"/>
                                </Button>
                             </a>
                        </motion.div>
                    </div>

                    {/* QR CODE REAL */}
                    <motion.div variants={fadeInUp} className="relative z-10 shrink-0">
                        <div className="bg-white p-4 rounded-3xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 group">
                            <div className="bg-gray-100 rounded-2xl p-1 w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden bg-white">
                                {/* IMAGEM GERADA PELA API QRSERVER */}
                                <img 
                                    src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://bemcasadosapp.com.br/casamento-principal&ecc=H&margin=10&color=111827&bgcolor=ffffff" 
                                    alt="QR Code do Casamento Exemplo"
                                    className="w-full h-full object-contain mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                                
                                {/* Ícone de Presente sobreposto (graças ao ecc=H do QR Code) */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-100">
                                         <Gift className="text-rose-600 w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-widest mt-4 group-hover:text-rose-600 transition-colors">
                                Scan para ver
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </section>

        {/* --- FAQ --- */}
        <section id="faq" className="py-16 sm:py-24 bg-white px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">Perguntas Frequentes</h2>
              <p className="mt-2 sm:mt-4 text-gray-500 text-sm sm:text-base font-medium">Tire suas dúvidas antes de começar</p>
            </motion.div>
            
            <motion.div variants={fadeInUp}>
              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="item-1" className="border-none">
                  <AccordionTrigger className="text-left font-bold text-gray-800 text-sm sm:text-base bg-gray-50 px-6 rounded-2xl hover:bg-gray-100 hover:no-underline data-[state=open]:bg-rose-50 data-[state=open]:text-rose-700">
                      Se eu colocar um presente de R$ 100, quanto recebo?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-sm sm:text-base leading-relaxed px-6 pt-4">
                    Nosso sistema calcula automaticamente uma taxa adicional para o convidado pagar. Assim, após descontar as taxas do Asaas e da plataforma, você recebe aproximadamente os R$ 100,00 integrais (podendo variar centavos para cima dependendo das promoções vigentes do Asaas).
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2" className="border-none">
                  <AccordionTrigger className="text-left font-bold text-gray-800 text-sm sm:text-base bg-gray-50 px-6 rounded-2xl hover:bg-gray-100 hover:no-underline data-[state=open]:bg-rose-50 data-[state=open]:text-rose-700">
                      O que é a taxa de 1%?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-sm sm:text-base leading-relaxed px-6 pt-4">
                    A plataforma BemCasados cobra apenas 1% sobre o valor transacionado para manutenção dos servidores e suporte. O restante das taxas são cobradas diretamente pelo gateway de pagamento (Asaas).
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-none">
                  <AccordionTrigger className="text-left font-bold text-gray-800 text-sm sm:text-base bg-gray-50 px-6 rounded-2xl hover:bg-gray-100 hover:no-underline data-[state=open]:bg-rose-50 data-[state=open]:text-rose-700">
                      Preciso ter conta no Asaas?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-sm sm:text-base leading-relaxed px-6 pt-4">
                    Sim! Para garantir segurança total e transparência, não tocamos no seu dinheiro. Ele vai direto para sua conta Asaas. É necessário ter a conta aprovada e a API Key para usar a plataforma.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          </motion.div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-rose-600 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-16 text-center text-white relative overflow-hidden shadow-2xl shadow-rose-200"
            >
                <div className="absolute top-0 right-0 -mr-10 -mt-10 sm:-mr-20 sm:-mt-20 w-40 h-40 sm:w-64 sm:h-64 bg-rose-500 rounded-full opacity-50 blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 sm:-ml-20 sm:-mb-20 w-40 h-40 sm:w-64 sm:h-64 bg-orange-500 rounded-full opacity-30 blur-3xl" />
                
                <h2 className="text-2xl sm:text-5xl font-black mb-4 sm:mb-6 relative z-10 px-2 leading-tight tracking-tight">
                    Pronto para começar sua história?
                </h2>
                <p className="text-rose-100 text-sm sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto relative z-10 px-4 font-medium">
                    Junte-se a milhares de casais que já realizaram seus sonhos com segurança e praticidade.
                </p>
                <Link href="/register" className="relative z-10 inline-block w-full sm:w-auto px-4">
                    <Button size="lg" className="bg-white text-rose-600 hover:bg-rose-50 h-12 sm:h-14 px-8 sm:px-10 rounded-full text-base sm:text-xl font-black w-full transition-transform hover:scale-105 shadow-lg">
                        Criar Minha Lista Agora
                    </Button>
                </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-white py-12 border-t border-gray-100 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-rose-50 p-2 rounded-xl">
                <Gift className="text-rose-600 w-5 h-5" />
            </div>
            {/* Removido 'font-serif' aqui tbm */}
            <span className="font-bold text-gray-900">BemCasados</span>
          </div>
          
          <div className="text-gray-400 text-[10px] sm:text-xs text-center font-medium">
            <p>&copy; {new Date().getFullYear()} BemCasados. Todos os direitos reservados.</p>
          </div>
          
          <div className="flex gap-6">
             <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Compra Segura
             </div>
             <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-rose-500" /> Dados Protegidos
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- CARD ANIMADO ---
function StepCard({ number, icon, title, description }: { number: string, icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      variants={fadeInUp}
      className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-rose-100/50 transition-all duration-300 group hover:-translate-y-1"
    >
      <div className="flex justify-between items-start mb-4 sm:mb-6">
        {/* CONTAINER DO ÍCONE */}
        <div className="bg-rose-50 text-rose-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <span className="text-4xl sm:text-5xl font-black text-gray-100 group-hover:text-rose-100 transition-colors duration-300">{number}</span>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 tracking-tight">{title}</h3>
      <p className="text-sm sm:text-base text-gray-500 leading-relaxed font-medium">{description}</p>
    </motion.div>
  )
}