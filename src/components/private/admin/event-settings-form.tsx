'use client'

import { useState } from "react"
import { updateEventSettings } from "@/actions/event-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { X, Upload, Loader2, Music, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { Event, GalleryItem } from "@prisma/client"
import { useRouter } from "next/navigation"

type EventWithGallery = Event & { galleryItems: GalleryItem[] }

interface EventSettingsFormProps {
  event: EventWithGallery
}

interface LocalKeptItem { type: 'kept'; id: string; url: string; caption: string }
interface LocalNewItem { type: 'new'; id: string; file: File; previewUrl: string; caption: string }
type LocalGalleryItem = LocalKeptItem | LocalNewItem;

export function EventSettingsForm({ event }: EventSettingsFormProps) {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()
  
  const [galleryItems, setGalleryItems] = useState<LocalGalleryItem[]>(() => {
    return event.galleryItems
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(item => ({
        type: 'kept',
        id: item.id,
        url: item.imageUrl,
        caption: item.caption || ''
      }));
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      
      if (galleryItems.length + files.length > 10) {
        toast.error("Máximo de 10 fotos permitido na galeria.")
        return
      }

      const newItems: LocalNewItem[] = files.map(file => ({
        type: 'new',
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        caption: ''
      }));

      setGalleryItems(prev => [...prev, ...newItems]);
      e.target.value = ""
    }
  }

  const removeItem = (indexToRemove: number) => {
    setGalleryItems(prev => {
        const item = prev[indexToRemove];
        if (item.type === 'new') {
            URL.revokeObjectURL(item.previewUrl);
        }
        return prev.filter((_, idx) => idx !== indexToRemove);
    })
  }

  const updateCaption = (index: number, newCaption: string) => {
    setGalleryItems(prev => prev.map((item, idx) => 
        idx === index ? { ...item, caption: newCaption } : item
    ));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)

    const formData = new FormData()
    const form = e.currentTarget

    formData.append("introTitle", (form.elements.namedItem("introTitle") as HTMLInputElement).value)
    formData.append("introSubtitle", (form.elements.namedItem("introSubtitle") as HTMLInputElement).value)
    formData.append("welcomeMessage", (form.elements.namedItem("welcomeMessage") as HTMLTextAreaElement).value)
    formData.append("videoUrl", (form.elements.namedItem("videoUrl") as HTMLInputElement).value)

    galleryItems.forEach(item => {
        if (item.type === 'kept') {
            formData.append("keptUrls", item.url);
            formData.append("keptCaptions", item.caption);
        } else {
            formData.append("newFiles", item.file);
            formData.append("newCaptions", item.caption);
        }
    });

    try {
        const result = await updateEventSettings(formData)
        if(result.success) {
            toast.success("Evento atualizado com sucesso!")
            router.refresh()
            // Limpa os objetos de URL para evitar vazamento de memória
            galleryItems.forEach(item => {
                if(item.type === 'new') URL.revokeObjectURL(item.previewUrl);
            });
        }
    } catch  {
        toast.error("Erro ao atualizar evento.")
    } finally {
        setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
      
      <Card className="border-none sm:border shadow-none sm:shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <ImageIcon className="w-5 h-5 text-rose-500"/>
                Galeria & Stories
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
                Adicione até 10 fotos. Elas aparecerão como stories no seu site.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {galleryItems.map((item, idx) => {
                    const imageUrl = item.type === 'kept' ? item.url : item.previewUrl;
                    return (
                    <div key={item.id} className="space-y-2 animate-in fade-in zoom-in duration-300">
                        <div className="relative aspect-[9/16] bg-gray-100 rounded-2xl overflow-hidden border shadow-sm group">
                            {/* USAMOS <img> NATIVA PARA ARQUIVOS NOVOS (BLOB) 
                                PARA EVITAR IMAGENS CORROMPIDAS NO PREVIEW
                            */}
                            {item.type === 'new' ? (
                                <img 
                                    src={imageUrl} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                <Image 
                                    src={imageUrl} 
                                    alt="Foto galeria" 
                                    fill 
                                    className="object-cover" 
                                    unoptimized // Evita que o Next tente processar URLs externas no admin
                                />
                            )}
                            
                            {item.type === 'new' && (
                                <div className="absolute top-2 left-2 pointer-events-none">
                                    <span className="text-[10px] font-bold text-white bg-rose-500 px-2 py-1 rounded-full shadow-lg">NOVA</span>
                                </div>
                            )}
                            
                            <button 
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg active:scale-90"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 px-1">
                             <Input 
                                placeholder="Legenda..."
                                value={item.caption}
                                onChange={(e) => updateCaption(idx, e.target.value)}
                                className="h-9 text-xs sm:text-sm rounded-xl border-gray-100 focus:bg-white"
                             />
                        </div>
                    </div>
                )})}

                {galleryItems.length < 10 && (
                    <label className="flex flex-col items-center justify-center aspect-[9/16] border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-rose-500 hover:bg-rose-50 transition bg-gray-50/50 active:bg-rose-100 min-h-[200px]">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500 font-bold text-center px-2">Adicionar Foto</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleFileSelect}
                        />
                    </label>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-50">
                <div className="space-y-1.5">
                    <Label htmlFor="introTitle" className="text-xs font-bold text-gray-500 uppercase">Título da Entrada</Label>
                    <Input name="introTitle" id="introTitle" defaultValue={event.introTitle} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="introSubtitle" className="text-xs font-bold text-gray-500 uppercase">Subtítulo</Label>
                    <Input name="introSubtitle" id="introSubtitle" defaultValue={event.introSubtitle} className="h-11 rounded-xl" />
                </div>
            </div>
        </CardContent>
      </Card>

      <Card className="border-none sm:border shadow-none sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Music className="w-5 h-5 text-rose-500"/>
                Conteúdo & Música
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
            <div className="space-y-1.5">
                <Label htmlFor="videoUrl" className="text-xs font-bold text-gray-500 uppercase">Link do YouTube (Música)</Label>
                <Input name="videoUrl" id="videoUrl" defaultValue={event.videoUrl || ""} placeholder="https://www.youtube.com/watch?v=..." className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="welcomeMessage" className="text-xs font-bold text-gray-500 uppercase">Mensagem aos Convidados</Label>
                <Textarea name="welcomeMessage" id="welcomeMessage" defaultValue={event.welcomeMessage || ""} placeholder="Escreva algo carinhoso..." className="min-h-[120px] rounded-2xl" />
            </div>
        </CardContent>
      </Card>

      <div className="px-4 sm:px-0">
        <Button type="submit" disabled={isPending} className="w-full h-14 text-lg font-bold rounded-2xl bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95">
            {isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</> : "Salvar Configurações"}
        </Button>
      </div>
    </form>
  )
}