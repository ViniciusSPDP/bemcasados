// src/app/(auth)/login/page.tsx
'use client'

import { loginAction } from '@/actions/auth' // Importe a nova action
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo de volta!</h2>
          <p className="mt-2 text-sm text-gray-600">Acesse o painel do seu casamento</p>
        </div>

        <form action={action} className="mt-8 space-y-6">
          <div className="space-y-4">
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="seu@email.com" 
                autoComplete="email"
              />
              {state?.error?.email && (
                <p className="text-sm text-red-500 mt-1">{state.error.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                autoComplete="current-password"
              />
              {state?.error?.password && (
                <p className="text-sm text-red-500 mt-1">{state.error.password}</p>
              )}
            </div>

          </div>

          {/* Mensagem de Erro Geral (ex: Senha incorreta) */}
          {state?.message && (
             <div className="p-3 rounded bg-red-50 border border-red-100">
                <p className="text-sm text-red-600 text-center font-medium">
                  {state.message}
                </p>
             </div>
          )}

          <Button disabled={isPending} type="submit" className="w-full">
            {isPending ? 'Entrando...' : 'Entrar'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Ainda não tem um evento?{' '}
            <Link href="/register" className="font-semibold text-rose-600 hover:text-rose-500">
              Criar conta grátis
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}