import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// Configuração das fontes
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter" 
});

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-playfair" 
});

// URL BASE do seu site para SEO
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; 

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BemCasados | Crie sua Lista de Presentes",
    template: "%s | BemCasados" 
  },
  description: "A plataforma perfeita para criar seu site de casamento, receber presentes em dinheiro e encantar seus convidados.",
  keywords: ["casamento", "lista de presentes", "site de casamento", "presentes em dinheiro"],
  authors: [{ name: "BemCasados Team" }],
  creator: "BemCasados",
  
  icons: {
    icon: "/icon.svg", 
    shortcut: "/icon.svg",
    apple: "/icon.svg", 
  },

  // Configuração para WhatsApp, Facebook e Redes Sociais
  openGraph: {
    title: "BemCasados | O Melhor para seu Casamento",
    description: "Crie seu site de casamento e lista de presentes em minutos.",
    url: SITE_URL,
    siteName: "BemCasados",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/opengraph-image.jpg", // Atualizado para o novo arquivo
        width: 1200,
        height: 630,
        alt: "BemCasados Preview",
      },
    ],
  },

  // Configuração para o Twitter/X
  twitter: {
    card: "summary_large_image",
    title: "BemCasados",
    description: "Sua lista de presentes inteligente.",
    images: ["/opengraph-image.jpg"], // Atualizado para o novo arquivo
  },
};

export const viewport: Viewport = {
  themeColor: "#e11d48", // Cor Rose do seu tema
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased bg-gray-50 text-gray-900 font-sans">
        {children}
      </body>
    </html>
  );
}