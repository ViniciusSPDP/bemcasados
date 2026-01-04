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
import { Event } from "@prisma/client"

interface EventSettingsFormProps {
  event: Event
}

export function EventSettingsForm({ event }: EventSettingsFormProps) {
  const [isPending, setIsPending] = useState(false)
  
  const [currentImages, setCurrentImages] = useState<string[]>(event.galleryImages || [])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      
      const totalImages = currentImages.length + newFiles.length + files.length
      if (totalImages > 10) {
        toast.error("Máximo de 10 fotos permitido na galeria.")
        return
      }

      setNewFiles(prev => [...prev, ...files])
      
      const newUrls = files.map(file => URL.createObjectURL(file))
      setNewPreviews(prev => [...prev, ...newUrls])
      
      e.target.value = ""
    }
  }

  const removeCurrentImage = (indexToRemove: number) => {
    setCurrentImages(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const removeNewFile = (indexToRemove: number) => {
    setNewFiles(prev => prev.filter((_, idx) => idx !== indexToRemove))
    setNewPreviews(prev => {
        URL.revokeObjectURL(prev[indexToRemove])
        return prev.filter((_, idx) => idx !== indexToRemove)
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)

    const formData = new FormData()
    const form = e.currentTarget

    // Adiciona campos de texto manualmente para garantir integridade
    formData.append("introTitle", (form.elements.namedItem("introTitle") as HTMLInputElement).value)
    formData.append("introSubtitle", (form.elements.namedItem("introSubtitle") as HTMLInputElement).value)
    formData.append("welcomeMessage", (form.elements.namedItem("welcomeMessage") as HTMLTextAreaElement).value)
    formData.append("videoUrl", (form.elements.namedItem("videoUrl") as HTMLInputElement).value)

    // Adiciona imagens mantidas
    currentImages.forEach(url => {
        formData.append("keptImages", url)
    })

    // Adiciona novas imagens
    newFiles.forEach((file) => {
        formData.append("newImages", file)
    })

    try {
        const result = await updateEventSettings(formData)
        if(result.success) {
            toast.success("Evento atualizado com sucesso!")
            setNewFiles([])
            setNewPreviews([])
        }
    } catch (error) {
        toast.error("Erro ao atualizar evento.")
        console.error(error)
    } finally {
        setIsPending(false)
    }
  }

  const isLocal = process.env.NODE_ENV === 'development'; 


  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-rose-500"/>
                Galeria & Stories
            </CardTitle>
            <CardDescription>
                Essas fotos aparecerão na animação de entrada do seu site. Escolha até 10 fotos.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Imagens Antigas */}
                {currentImages.map((url, idx) => (
                    <div key={`old-${idx}`} className="relative aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden border">
                        <Image src={url} unoptimized={isLocal} alt="Foto galeria" fill className="object-cover" />
                        <button 
                            type="button"
                            onClick={() => removeCurrentImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {/* Novas Imagens */}
                {newPreviews.map((url, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-[9/16] bg-gray-50 rounded-lg overflow-hidden border border-dashed border-rose-300">
                        <Image src={url} unoptimized={isLocal} alt="Nova foto" fill className="object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">NOVA</span>
                        </div>
                        <button 
                            type="button"
                            onClick={() => removeNewFile(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {/* Botão Upload */}
                {(currentImages.length + newFiles.length) < 10 && (
                    <label className="flex flex-col items-center justify-center aspect-[9/16] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-rose-500 hover:bg-rose-50 transition bg-gray-50/50">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="introTitle">Título da Entrada</Label>
                    <Input 
                        name="introTitle" 
                        defaultValue={event.introTitle} 
                        placeholder="VOCÊ FOI CONVOCADO" 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="introSubtitle">Subtítulo</Label>
                    <Input 
                        name="introSubtitle" 
                        defaultValue={event.introSubtitle} 
                        placeholder="PARA UMA MISSÃO ESPECIAL" 
                    />
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
                <Input 
                    name="videoUrl" 
                    defaultValue={event.videoUrl || ""} 
                    placeholder="https://www.youtube.com/watch?v=..." 
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Mensagem Final</Label>
                <Textarea 
                    name="welcomeMessage" 
                    defaultValue={event.welcomeMessage || ""} 
                    placeholder="Escreva algo carinhoso..." 
                    className="min-h-[100px]"
                />
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="w-full md:w-auto min-w-[200px]">
            {isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                </>
            ) : (
                "Salvar Configurações"
            )}
        </Button>
      </div>

    </form>
  )
}