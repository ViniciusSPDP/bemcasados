import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Gift, Heart, ShieldCheck, 
  Smartphone, Wallet, Sparkles, CheckCircle2,
  Menu // Adicionado para mobile
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
} from "@/components/ui/sheet"; // Certifique-se de ter o componente Sheet do shadcn instalado

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER RESPONSIVO */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 p-1.5 rounded-lg">
                <Gift className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg sm:text-xl text-gray-800 tracking-tight">BemCasados</span>
          </div>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#como-funciona" className="text-sm font-medium text-gray-600 hover:text-rose-600 transition">Como Funciona</Link>
            <Link href="#faq" className="text-sm font-medium text-gray-600 hover:text-rose-600 transition">Dúvidas</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="hidden xs:block text-sm font-medium text-gray-600 hover:text-rose-600 transition px-2">
              Entrar
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-4 sm:px-6 shadow-md text-xs sm:text-sm">
                Criar Lista Grátis
              </Button>
            </Link>
            
            {/* Menu Mobile (Trigger) */}
            <div className="md:hidden ml-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-600">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                  <nav className="flex flex-col gap-6 mt-10">
                    <Link href="#como-funciona" className="text-lg font-semibold text-gray-800">Como Funciona</Link>
                    <Link href="#faq" className="text-lg font-semibold text-gray-800">Dúvidas</Link>
                    <hr />
                    <Link href="/login" className="text-lg font-semibold text-rose-600">Entrar na Conta</Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION RESPONSIVA */}
        <section className="relative py-12 sm:py-20 lg:py-32 overflow-hidden px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-rose-100/50 via-white to-orange-50/50 -z-10" />
          
          <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-sm font-semibold mb-2 animate-bounce">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> Novo: Stories Animados
            </div>
            
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.15] sm:leading-[1.1]">
              Sua lista de presentes <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500">convertida em dinheiro</span>.
            </h1>
            
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
              Crie um site emocionante com a história do casal. Receba o valor de cada presente direto via PIX para usar como quiser.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 px-4 sm:px-0">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-12 sm:h-14 text-base sm:text-lg rounded-full bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-200">
                  Começar Minha Lista <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/casamento-principal" className="w-full sm:w-auto">
                 <Button variant="outline" size="lg" className="w-full h-12 sm:h-14 text-base sm:text-lg rounded-full border-gray-300 hover:bg-gray-50 text-gray-600 bg-white">
                  Ver Exemplo Real
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA RESPONSIVO */}
        <section id="como-funciona" className="py-16 sm:py-24 bg-gray-50/50 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 px-4">Tudo o que você precisa em 3 passos</h2>
            </div>
            {/* Grid ajustado: 1 coluna mobile, 3 desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <StepCard 
                number="01"
                icon={<Smartphone className="w-6 h-6 text-rose-600" />}
                title="Crie seu site"
                description="Adicione fotos, a história de vocês e escolha os presentes da nossa lista sugerida."
              />
              <StepCard 
                number="02"
                icon={<Heart className="w-6 h-6 text-rose-600" />}
                title="Compartilhe"
                description="Envie o link para seus convidados. Eles compram com PIX, boleto ou cartão."
              />
              <StepCard 
                number="03"
                icon={<Wallet className="w-6 h-6 text-rose-600" />}
                title="Receba o valor"
                description="O valor cai na sua carteira virtual e você resgata via PIX para sua conta bancária."
              />
            </div>
          </div>
        </section>

        {/* FAQ RESPONSIVO */}
        <section id="faq" className="py-16 sm:py-24 bg-white px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">Perguntas Frequentes</h2>
              <p className="mt-2 sm:mt-4 text-gray-600 text-base sm:text-lg">Tire suas dúvidas antes de começar</p>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b">
                <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">Como eu recebo o dinheiro?</AccordionTrigger>
                <AccordionContent className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  Todos os presentes são convertidos em saldo. Você solicita o resgate via PIX diretamente para sua conta bancária.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-b">
                <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">Quais as taxas do sistema?</AccordionTrigger>
                <AccordionContent className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  A criação é gratuita. Cobramos uma taxa de processamento que você pode optar por repassar ao convidado.
                </AccordionContent>
              </AccordionItem>
              {/* Adicione outros itens se necessário seguindo o mesmo padrão */}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA RESPONSIVO */}
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-rose-600 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-16 text-center text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 sm:-mr-20 sm:-mt-20 w-40 h-40 sm:w-64 sm:h-64 bg-rose-500 rounded-full opacity-50" />
                <h2 className="text-2xl sm:text-5xl font-bold mb-4 sm:mb-6 relative z-10 px-2 leading-tight">Pronto para começar sua história?</h2>
                <p className="text-rose-100 text-sm sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto relative z-10 px-4">
                    Junte-se a milhares de casais que já realizaram seus sonhos.
                </p>
                <Link href="/register" className="relative z-10 inline-block w-full sm:w-auto px-4">
                    <Button size="lg" className="bg-white text-rose-600 hover:bg-rose-50 h-12 sm:h-14 px-8 sm:px-10 rounded-full text-base sm:text-xl font-bold w-full transition-transform">
                        Criar Minha Lista Agora
                    </Button>
                </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER RESPONSIVO */}
      <footer className="bg-white py-10 border-t px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Gift className="text-rose-600 w-5 h-5" />
            <span className="font-bold text-gray-800">BemCasados</span>
          </div>
          <div className="text-gray-500 text-[10px] sm:text-xs text-center">
            <p>&copy; {new Date().getFullYear()} BemCasados. Todos os direitos reservados.</p>
          </div>
          <div className="flex gap-6">
             <Link href="#" className="text-gray-400 hover:text-rose-600"><CheckCircle2 className="w-5 h-5" /></Link>
             <Link href="#" className="text-gray-400 hover:text-rose-600"><ShieldCheck className="w-5 h-5" /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ number, icon, title, description }: { number: string, icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition group">
      <div className="flex justify-between items-start mb-4 sm:mb-6">
        <div className="bg-rose-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
          {icon}
        </div>
        <span className="text-3xl sm:text-4xl font-black text-gray-100">{number}</span>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}