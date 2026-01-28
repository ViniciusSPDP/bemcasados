'use client';
import Link from "next/link";
import { HeartOff, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center space-y-8">
                {/* ÍCONE IMPACTANTE */}
                <div className="relative flex justify-center">
                    <div className="absolute inset-0 bg-rose-100 blur-3xl rounded-full opacity-50" />
                    <div className="relative bg-white border border-rose-50 p-6 rounded-[2.5rem] shadow-xl text-rose-500">
                        <HeartOff size={48} strokeWidth={1.5} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
                        Ops! Caminho <br /> <span className="text-rose-600">Interrompido</span>
                    </h1>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        Não conseguimos encontrar a página ou o presente que procura. 
                        Pode ter sido removido ou o link está incorreto.
                    </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    <Link 
                        href="/"
                        className="flex items-center justify-center gap-2 bg-rose-600 text-white h-14 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-200"
                    >
                        <Home size={18} />
                        Ir para Início
                    </Link>
                    
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center gap-2 bg-gray-50 text-gray-400 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-all"
                    >
                        <ArrowLeft size={16} />
                        Voltar à página anterior
                    </button>
                </div>

                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300 pt-10">
                    BemCasadosApp • Erro 404
                </p>
            </div>
        </div>
    );
}