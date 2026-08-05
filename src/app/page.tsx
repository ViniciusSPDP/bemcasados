import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Gift, Heart, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-rose-600" />
            <span className="font-bold text-xl text-gray-800 tracking-tight">BemCasados</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-rose-600 transition">
              Entrar
            </Link>
            <Link href="/register">
              <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-6">
                Criar Conta Grátis
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1">
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-rose-50 via-white to-orange-50 -z-10" />
          
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1]">
              A lista de presentes que <span className="text-transparent bg-clip-text bg-linear-to-r from-rose-600 to-orange-500">realiza sonhos</span>.
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Receba o valor dos presentes em dinheiro direto na sua conta. 
              Sem taxas abusivas, com um site personalizado e emocionante para seus convidados.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 text-lg rounded-full bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-200">
                  Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/casamento-principal" className="w-full sm:w-auto">
                 <Button variant="outline" size="lg" className="w-full h-14 text-lg rounded-full border-gray-300 hover:bg-gray-50 text-gray-600">
                  Ver Exemplo Real
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<Heart className="w-8 h-8 text-rose-500" />}
              title="Site Emocionante"
              description="Stories animados, fotos e músicas para encantar seus convidados desde o primeiro clique."
            />
            <FeatureCard 
              icon={<Gift className="w-8 h-8 text-rose-500" />}
              title="Dinheiro na Conta"
              description="Seus convidados compram o presente e você recebe o valor em PIX. Liberdade total."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-8 h-8 text-rose-500" />}
              title="Segurança Total"
              description="Pagamentos processados com segurança e painel administrativo transparente."
            />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-50 py-12 border-t">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm space-y-3">
          <p>&copy; {new Date().getFullYear()} BemCasados. Feito com amor.</p>
          <nav className="flex items-center justify-center gap-6">
            <Link href="/politica-de-privacidade" className="hover:text-gray-800 transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/termos-de-uso" className="hover:text-gray-800 transition-colors">
              Termos de Uso
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-gray-50 hover:bg-rose-50/50 transition duration-300 border border-transparent hover:border-rose-100">
      <div className="bg-white p-4 rounded-full shadow-sm">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}