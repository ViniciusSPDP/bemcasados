'use client'

import { signup } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useActionState } from "react"


export default function RegisterPage(){
    const [state, action, isPending] = useActionState(signup, undefined)

    return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Crie seu Evento</h2>
          <p className="mt-2 text-gray-600">Comece sua lista de presentes</p>
        </div>

        <form action={action} className="mt-8 space-y-6">
          
          {/* Dados do Usuário */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Casal</Label>
              <Input id="name" name="name" placeholder="Ex: Ana e Pedro" />
              {state?.error?.name && <p className="text-sm text-red-500 mt-1">{state.error.name}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="email@exemplo.com" />
              {state?.error?.email && <p className="text-sm text-red-500 mt-1">{state.error.email}</p>}
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" />
              {state?.error?.password && (
                <div className="text-sm text-red-500 mt-1">
                  <ul>
                    {state.error.password.map((error) => (
                      <li key={error}>- {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="grow border-t border-gray-200"></div>
            <span className="shrink-0 mx-4 text-gray-400 text-xs">DADOS DO EVENTO</span>
            <div className="grow border-t border-gray-200"></div>
          </div>

          {/* Dados do Evento */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventName">Nome do Evento</Label>
              <Input id="eventName" name="eventName" placeholder="Casamento Ana e Pedro" />
              {state?.error?.eventName && <p className="text-sm text-red-500 mt-1">{state.error.eventName}</p>}
            </div>

            <div>
              <Label htmlFor="slug">Link Personalizado</Label>
              <div className="flex items-center space-x-2">
                 <span className="text-gray-400 text-sm">.../</span>
                 <Input id="slug" name="slug" placeholder="ana-e-pedro" />
              </div>
              {state?.error?.slug && <p className="text-sm text-red-500 mt-1">{state.error.slug}</p>}
            </div>

            <div>
              <Label htmlFor="eventDate">Data do Casamento</Label>
              <Input id="eventDate" name="eventDate" type="date" />
              {state?.error?.eventDate && <p className="text-sm text-red-500 mt-1">{state.error.eventDate}</p>}
            </div>
          </div>

          {state?.message && (
             <p className="text-sm text-red-600 text-center font-medium bg-red-50 p-2 rounded">{state.message}</p>
          )}

          <Button disabled={isPending} type="submit" className="w-full">
            {isPending ? 'Criando conta...' : 'Criar Evento Grátis'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-semibold text-rose-600 hover:text-rose-500">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}