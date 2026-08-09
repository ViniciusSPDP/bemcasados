import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Great_Vibes } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// As variáveis são mapeadas para `font-sans`/`font-serif`/`font-script` no
// globals.css. `next/font` faz self-host dos arquivos, então nada disso bate em
// fonts.gstatic.com e a CSP (`font-src 'self' data:`) continua fechada.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
// Caligráfica do convite. Um peso só — é a única que a família oferece.
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-great-vibes" });

// 1. URL BASE do seu site (Importante para SEO e compartilhamento)
// Quando subir para produção, mude para "https://seusite.com.br"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; 

// 2. Configuração de SEO Global
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BemCasados | Crie sua Lista de Presentes",
    template: "%s | BemCasados" // Isso permite que páginas filhas tenham titulos como "Ana & Pedro | BemCasados"
  },
  description: "A plataforma perfeita para criar seu site de casamento, receber presentes em dinheiro e encantar seus convidados.",
  keywords: ["casamento", "lista de presentes", "site de casamento", "presentes em dinheiro"],
  authors: [{ name: "BemCasados Team" }],
  creator: "BemCasados",
  
  // Ícones (Favicon)
  icons: {
    icon: "/icon.svg", // O arquivo que criamos
    shortcut: "/icon.svg",
    apple: "/icon.svg", // Ícone para iPhone/iPad
  },

  // Open Graph (Como aparece no WhatsApp/Facebook)
  openGraph: {
    title: "BemCasados | O Melhor para seu Casamento",
    description: "Crie seu site de casamento e lista de presentes em minutos.",
    url: SITE_URL,
    siteName: "BemCasados",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg", // Você deve criar uma imagem 1200x630px e colocar em public/
        width: 1200,
        height: 630,
        alt: "BemCasados Preview",
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "BemCasados",
    description: "Sua lista de presentes inteligente.",
    images: ["/og-image.jpg"],
  },
};

// 3. Configuração de Viewport (Cores da barra do navegador no mobile)
export const viewport: Viewport = {
  themeColor: "#e11d48", // A cor Rose do seu tema
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Evita zoom indesejado em inputs no iOS
  // Sem `cover`, o iPhone reserva faixas nas bordas e o fundo do convite para
  // antes do topo da tela. É também o que habilita `env(safe-area-inset-*)`,
  // usado para o conteúdo não passar por baixo da Dynamic Island.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} ${greatVibes.variable}`}>
      <body className="antialiased bg-gray-50 text-gray-900 font-sans">
        {children}
        {/*
          Sem isto os `toast()` espalhados pelos formulários não aparecem em
          lugar nenhum — o casal salvava um presente e não recebia confirmação
          nem mensagem de erro.
        */}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}