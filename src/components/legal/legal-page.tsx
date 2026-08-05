import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

interface LegalPageProps {
  title: string;
  /** Data da última revisão, exibida no topo. */
  updatedAt: string;
  children: React.ReactNode;
}

/** Casca compartilhada pelas páginas de política e termos. */
export function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-rose-600 font-bold">
            <Heart size={20} fill="currentColor" />
            BemCasados
          </Link>
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
        <p className="text-sm text-stone-500 mt-2">Última atualização: {updatedAt}</p>

        <div className="mt-8 space-y-5 text-stone-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_code]:bg-stone-200 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm">
          {children}
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 text-sm text-stone-500 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/politica-de-privacidade" className="hover:text-stone-800 transition-colors">
            Política de Privacidade
          </Link>
          <Link href="/termos-de-uso" className="hover:text-stone-800 transition-colors">
            Termos de Uso
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 pt-4">
      <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}
