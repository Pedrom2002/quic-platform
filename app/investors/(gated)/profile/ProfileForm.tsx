'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from './actions'

export function ProfileForm({
  initialFullName,
  initialPhone,
}: {
  initialFullName: string
  initialPhone: string
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [phone, setPhone] = useState(initialPhone)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    const formData = new FormData()
    formData.set('fullName', fullName)
    formData.set('phone', phone)

    const result = await updateProfile(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName" className="text-zinc-300">Nome completo</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-zinc-300">Telefone</Label>
        <Input
          id="phone"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900 rounded-md px-3 py-2">
          Alterações guardadas.
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'A guardar...' : 'Guardar'}
      </Button>
    </form>
  )
}
