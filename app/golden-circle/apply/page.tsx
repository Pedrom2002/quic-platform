'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Mail, Check, AlertCircle } from 'lucide-react'

export default function GoldenCircleApplyPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/golden-circle/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, company, message }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Erro ao enviar candidatura. Tenta novamente.')
        setLoading(false)
        return
      }

      setSubmitted(true)
      setFullName('')
      setEmail('')
      setPhone('')
      setCompany('')
      setMessage('')
    } catch {
      setError('Erro de ligação. Tenta novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}>
        <div className="relative max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-16">
          <Image src="/logo-branco.png" alt="Quic" width={110} height={44} priority className="mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white max-w-2xl">
            Solicitar Acesso ao Golden Circle
          </h1>
          <p className="text-white/70 mt-4 max-w-xl">
            Preenche o formulário abaixo e a nossa equipa entrará em contacto para avaliar a sua candidatura.
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-3">Candidatura Enviada</h2>
            <p className="text-green-700 mb-6">
              Obrigado por se candidatar ao Golden Circle. A nossa equipa irá analisar o teu perfil
              e entrará em contacto nos próximos 5-10 dias úteis.
            </p>
            <p className="text-sm text-green-600">
              Confirmação foi enviada para <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-stone-900">
                  Nome Completo *
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="João Silva"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--quic-magenta)] bg-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-stone-900">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="joao@exemplo.pt"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--quic-magenta)] bg-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-stone-900">
                  Telefone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+351 XXX XXX XXX"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--quic-magenta)] bg-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="company" className="block text-sm font-medium text-stone-900">
                  Empresa / Fundo
                </label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Nome da organização"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--quic-magenta)] bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-medium text-stone-900">
                Mensagem (opcional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Conta-nos um pouco sobre o teu interesse no Golden Circle..."
                rows={4}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--quic-magenta)] bg-white resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                <strong>Privacidade:</strong> Os teus dados serão utilizados exclusivamente para avaliação da candidatura
                e conformidade KYC/AML. Está obrigado a assinar um NDA antes de receber acesso a informações confidenciais.
                Consulta a nossa <a href="/privacy-policy" className="text-[var(--quic-magenta)] hover:underline">Política de Privacidade</a>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-[var(--quic-magenta)] text-white font-semibold rounded-lg hover:bg-[var(--quic-magenta-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'A enviar...' : 'Enviar Candidatura'}
            </button>

            <p className="text-xs text-stone-500 text-center">
              * Campos obrigatórios
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
