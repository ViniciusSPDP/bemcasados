"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Download, Copy, Check, Palette } from "lucide-react";
import { toast } from "sonner";

interface ShareEventProps {
  slug: string;
  coupleName: string;
}

export function ShareEvent({ slug, coupleName }: ShareEventProps) {
  const [qrColor, setQrColor] = useState("#e11d48"); // Rose-600 padrão
  const [copied, setCopied] = useState(false);
  
  // O uso de window.location.origin garante que funcione em qualquer ambiente (local ou prod)
  const url = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Casamento de ${coupleName}`,
          text: `Confira nossa lista de presentes e o convite digital!`,
          url: url,
        });
      } catch (error) {
        console.log("Erro ao compartilhar", error);
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        // Fundo branco para o QR Code exportado
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 1000, 1000);
        ctx.drawImage(img, 0, 0, 1000, 1000);
      }
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qrcode-${slug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Share2 size={18} className="text-rose-500" /> Compartilhar
        </h2>
        
        {/* SELETOR DE CORES */}
        <div className="flex items-center gap-2">
            {/* Opções Rápidas */}
            <button onClick={() => setQrColor("#e11d48")} className="w-5 h-5 rounded-full bg-rose-600 border-2 border-white shadow-sm active:scale-90 transition-transform" />
            <button onClick={() => setQrColor("#1e293b")} className="w-5 h-5 rounded-full bg-gray-900 border-2 border-white shadow-sm active:scale-90 transition-transform" />
            
            {/* Roda de Cores (Custom Color Picker) */}
            <label className="relative cursor-pointer group flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                <Palette size={14} className="text-gray-400 group-hover:text-rose-500" />
                <input 
                    type="color" 
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
            </label>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="p-4 bg-white rounded-[2rem] shadow-2xl shadow-rose-100 border border-rose-50 relative group">
          <QRCodeSVG
            id="qr-code-svg"
            value={url}
            size={200}
            fgColor={qrColor}
            level="H"
            includeMargin={true}
            imageSettings={{
              // SVG do Coração em Base64 para ficar no centro
              src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZTMxZDQ4IiBzdHJva2U9Im5vbmUiPjxwYXRoIGQ9Ik0xMiAyMS4zNmwtMS40NS0xLjMyQzUuNCAxNS4zNiAyIDEyLjI4IDIgOC41IDIgNS40MiA0LjQyIDMgNy41IDMgOS40MiAzIDExLjE3IDMuOTUgMTIgNS40Yy44My0xLjQ1IDIuNTgtMi40IDQuNS0yLjQgMy4wOCAwIDUuNSAyLjU4IDUuNSA1LjUgMCAzLjc4LTMuNCA2Ljg2LTguNTUgMTEuNTRMMTIgMjEuMzZ6Ii8+PC9zdmc+",
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        </div>

        {/* Informação da Cor Selecionada */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: qrColor }} />
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{qrColor}</span>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <button
            onClick={handleShare}
            className="col-span-2 flex items-center justify-center gap-2 bg-rose-600 text-white h-14 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-200"
          >
            <Share2 size={18} /> Enviar Convite
          </button>
          
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 bg-gray-50 text-gray-600 h-12 rounded-xl font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-all"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />} 
            Link
          </button>

          <button
            onClick={downloadQR}
            className="flex items-center justify-center gap-2 bg-gray-50 text-gray-600 h-12 rounded-xl font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-all"
          >
            <Download size={16} /> QR Code
          </button>
        </div>
      </div>
    </div>
  );
}