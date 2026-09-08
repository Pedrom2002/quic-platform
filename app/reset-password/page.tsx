'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Status = 'checking' | 'ready' | 'expired' | 'success'

function loginHrefFor(origin: string | null): string {
  return origin === 'investor' ? '/investors/login' : '/auth/login'
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const origin = searchParams.get('origin')
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ready' : 'expired')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A password precisa de pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError('Não foi possível repor a password. Tenta pedir um novo link.')
        setLoading(false)
        return
      }
      setStatus('success')
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
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Repor password</CardTitle>
            {status === 'ready' && (
              <CardDescription className="text-zinc-400">
                Escolhe a tua nova password.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {status === 'checking' && (
              <p className="text-sm text-zinc-400">A verificar o link...</p>
            )}

            {status === 'expired' && (
              <p role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-md px-3 py-2">
                Este link expirou ou já foi usado. Pede um novo link para repor a password.
              </p>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-zinc-300">Nova password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmar password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
                  {loading ? 'A repor...' : 'Repor password'}
                </Button>
              </form>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <p className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900 rounded-md px-3 py-2">
                  Password reposta com sucesso.
                </p>
                {origin === 'mobile' ? (
                  <a
                    href="quicapp://login"
                    className="block w-full text-center rounded-md bg-[var(--quic-magenta)] text-white py-2 text-sm font-medium hover:opacity-90"
                  >
                    Abrir a app
                  </a>
                ) : (
                  <a
                    href={loginHrefFor(origin)}
                    className="block w-full text-center rounded-md bg-[var(--quic-magenta)] text-white py-2 text-sm font-medium hover:opacity-90"
                  >
                    Ir para o login
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
