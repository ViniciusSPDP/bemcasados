'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateEventSettings } from "@/actions/event-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { X, Upload, Loader2, Music, Image as ImageIcon, Captions } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { GalleryItem } from "@prisma/client"
import { mediaUrl } from "@/lib/media"

/**
 * Só os campos que o formulário usa.
 *
 * O tipo era `Event` inteiro, o que trazia `asaasApiKey` e `walletId` junto —
 * e como este é um Client Component, tudo o que entra aqui é serializado para
 * o HTML da página. Listar os campos faz o compilador barrar o retorno deles.
 */
type EventSettingsData = {
  introTitle: string
  introSubtitle: string
  welcomeMessage: string | null
  videoUrl: string | null
  galleryItems: GalleryItem[]
}

interface EventSettingsFormProps {
  event: EventSettingsData
}

// Tipos para o estado local.
// `url` é a chave do objeto no bucket — é ela que volta para o servidor.
// `displayUrl` é a rota que o <Image> consome. Os dois não se misturam: mandar
// a URL de exibição de volta faria o servidor rejeitar o item.
interface LocalKeptItem { type: 'kept'; id: string; url: string; displayUrl: string; caption: string }
interface LocalNewItem { type: 'new'; id: string; file: File; previewUrl: string; caption: string }
type LocalGalleryItem = LocalKeptItem | LocalNewItem;

export function EventSettingsForm({ event }: EventSettingsFormProps) {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()
  
  // Estado unificado para gerenciar a ordem e as legendas
  const [galleryItems, setGalleryItems] = useState<LocalGalleryItem[]>(() => {
    // Inicializa com os itens vindos do banco, ordenados
    return event.galleryItems
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(item => ({
        type: 'kept',
        id: item.id,
        url: item.imageUrl,
        displayUrl: mediaUrl(item.imageUrl) ?? '',
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
        id: crypto.randomUUID(), // ID temporário para React key
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
            URL.revokeObjectURL(item.previewUrl); // Limpa memória
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

    // Separa e anexa os itens da galeria
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
        if(!result.success) {
            toast.error(result.message ?? "Não foi possível atualizar o evento.")
        } else {
            toast.success("Evento atualizado com sucesso!")
            // As fotos novas só ganham a chave definitiva no servidor, então o
            // estado local precisa vir de lá — sem o refresh a galeria ficaria
            // sem as imagens recém-enviadas até a próxima navegação.
            galleryItems.forEach(item => {
                if (item.type === 'new') URL.revokeObjectURL(item.previewUrl)
            })
            router.refresh()
        }
    } catch (error) {
        toast.error("Erro ao atualizar evento.")
        console.error(error)
    } finally {
        setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-rose-500"/>
                Galeria & Stories
            </CardTitle>
            <CardDescription>
                Adicione fotos e escreva uma legenda para cada momento. Máximo 10 fotos.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            
            {/* Grid de Galeria com Legendas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {galleryItems.map((item, idx) => {
                    const imageUrl = item.type === 'kept' ? item.displayUrl : item.previewUrl;
                    return (
                    <div key={item.id} className="space-y-2">
                        <div className="relative aspect-9/16 bg-gray-100 rounded-lg overflow-hidden border shadow-sm group">
                            <Image src={imageUrl} alt="Foto galeria" fill unoptimized={item.type === 'new'} className={`object-cover transition ${item.type === 'new' ? 'opacity-90' : ''}`} />
                            
                            {item.type === 'new' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                                    <span className="text-xs font-bold text-white bg-rose-500/80 px-2 py-1 rounded">NOVA</span>
                                </div>
                            )}
                            
                            <button 
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-600 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {/* Input de Legenda */}
                        <div className="flex items-center gap-2 px-1">
                             <Captions size={16} className="text-gray-400 shrink-0" />
                             <Input 
                                placeholder="Escreva uma legenda..."
                                value={item.caption}
                                onChange={(e) => updateCaption(idx, e.target.value)}
                                className="h-8 text-sm"
                             />
                        </div>
                    </div>
                )})}

                {/* Botão Upload */}
                {galleryItems.length < 10 && (
                    <label className="flex flex-col items-center justify-center aspect-9/16border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-rose-500 hover:bg-rose-50 transition bg-gray-50/50 h-full min-h-50">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500 font-medium text-center px-2">Adicionar Foto</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                    <Label htmlFor="introTitle">Título da Entrada</Label>
                    <Input name="introTitle" defaultValue={event.introTitle} placeholder="VOCÊ FOI CONVOCADO" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="introSubtitle">Subtítulo</Label>
                    <Input name="introSubtitle" defaultValue={event.introSubtitle} placeholder="PARA UMA MISSÃO ESPECIAL" />
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-rose-500"/>
                Mensagem & Música
            </CardTitle>
            <CardDescription>
                Personalize o que seus convidados verão e ouvirão ao abrir o site.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="videoUrl">Link do YouTube (Música de Fundo)</Label>
                <Input name="videoUrl" defaultValue={event.videoUrl || ""} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Mensagem Final</Label>
                <Textarea name="welcomeMessage" defaultValue={event.welcomeMessage || ""} placeholder="Escreva algo carinhoso..." className="min-h-25" />
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="w-full md:w-auto min-w-50">
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Configurações"}
        </Button>
      </div>
    </form>
  )
}