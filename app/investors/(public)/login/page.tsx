'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvestorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/investors/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Email ou password inválidos.')
        setLoading(false)
        return
      }

      router.push('/investors/dashboard' as any)
      router.refresh()
    } catch {
      setError('Erro de ligação. Tenta novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo-branco.png" alt="QUIC" width={130} height={52} className="mx-auto" />
          <p className="text-zinc-400 text-sm mt-1">Área de Investidor</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Entrar</CardTitle>
            <CardDescription className="text-zinc-400">
              Acesso à área de investidor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'A entrar...' : 'Entrar'}
              </Button>

              <p className="text-center text-sm text-zinc-500">
                Ainda não tens conta? <Link href="/investors/signup" className="text-[var(--quic-magenta)] hover:underline">Criar conta</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
