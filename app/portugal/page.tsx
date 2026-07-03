'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PortugalPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const play = () => void video.play()?.catch(() => undefined)
    if (!mq.matches) play()
    const onMotion = (e: MediaQueryListEvent) => {
      if (e.matches) { video.pause(); video.currentTime = 0 } else play()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') video.pause()
      else if (!mq.matches) play()
    }
    const onTimeUpdate = () => {
      if (video.currentTime >= 30) video.currentTime = 0
    }
    mq.addEventListener('change', onMotion)
    document.addEventListener('visibilitychange', onVisibility)
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      mq.removeEventListener('change', onMotion)
      document.removeEventListener('visibilitychange', onVisibility)
      video.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) {
      setError('Tens de aceitar o tratamento dos dados para continuar.')
      return
    }
    setError(null)
    setLoading(true)

    const res = await fetch('/api/portugal/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, consent }),
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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-black">
      {/* Video background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        src="/mundial.mp4"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1) scale(1.25)', transformOrigin: 'center' }}
        aria-hidden="true"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Card */}
      <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🍺⚽</div>
          <h1 className="text-2xl font-bold text-white">Ganha uma cerveja!</h1>
          <p className="text-sm text-white/70">
            Regista-te e concorre a uma cerveja durante o jogo de Portugal.
            Os vencedores recebem SMS.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">
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
              className="w-full rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 backdrop-blur-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="tu@exemplo.com"
              className="w-full rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 backdrop-blur-sm"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-1">
              Telemovel
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="912345678"
              className="w-full rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 backdrop-blur-sm"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 accent-red-600"
            />
            <span>
              Aceito que os meus dados sejam armazenados para participar no
              sorteio e receber comunicações da QUiC. Ver{' '}
              <Link
                href="/portugal/privacidade"
                className="text-white/90 underline hover:text-white"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-300 bg-red-900/40 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !consent}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors shadow-lg"
          >
            {loading ? 'A registar...' : 'Quero concorrer!'}
          </button>
        </form>

        <p className="text-center text-xs text-white/40">
          Powered by{' '}
          <a href="https://quic.pt" className="text-white/70 hover:text-white underline">QUiC</a>
        </p>
      </div>
    </div>
  )
}
