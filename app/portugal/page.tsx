'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PortugalPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/portugal/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json() as { ok?: boolean; error?: string }
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Erro ao registar. Tenta novamente.')
      return
    }

    router.push('/portugal/success')
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">🍺⚽</div>
        <h1 className="text-2xl font-bold text-gray-900">Ganha uma cerveja!</h1>
        <p className="text-sm text-gray-500">
          Regista-te e concorre a uma cerveja durante o jogo de Portugal.
          Os vencedores recebem SMS.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="O teu nome"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="tu@exemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Telemovel
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="912 345 678"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors"
        >
          {loading ? 'A registar...' : 'Quero concorrer!'}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400">
        Powered by{' '}
        <a href="https://quic.pt" className="text-red-600 hover:underline">QUiC</a>
      </p>
    </div>
  )
}
