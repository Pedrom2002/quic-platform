'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Star, TrendingUp, Layers, BarChart3, Brain, Info, KeyRound, Mail,
} from 'lucide-react'

type Tab =
  | 'golden-circle'
  | 'opportunities'
  | 'how-it-works'
  | 'track-record'
  | 'intelligence'
  | 'about'
  | 'investor-login'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'golden-circle', label: 'Golden Circle', icon: Star },
  { id: 'opportunities', label: 'Opportunities', icon: TrendingUp },
  { id: 'how-it-works', label: 'How It Works', icon: Layers },
  { id: 'track-record', label: 'Track Record', icon: BarChart3 },
  { id: 'intelligence', label: 'Intelligence', icon: Brain },
  { id: 'about', label: 'About', icon: Info },
  { id: 'investor-login', label: 'Investor Login', icon: KeyRound },
]

export default function GoldenCirclePublicPage() {
  const [activeTab, setActiveTab] = useState<Tab>('golden-circle')

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero + tab nav ── */}
      <section
        className="relative flex flex-col"
        style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}
      >
        <div className="relative z-10 border-b border-white/10">
          <div className="max-w-5xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
            <Image src="/logo-branco.png" alt="Quic" width={130} height={52} priority />
            <span className="text-[10px] tracking-[0.35em] uppercase text-white/30 hidden sm:block">
              Golden Circle
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-12 sm:py-16">
          <p className="text-[10px] font-medium tracking-[0.4em] uppercase text-white/40 mb-5">
            Investor Relations
          </p>
          <h1
            className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.0] mb-5"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Golden Circle
          </h1>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">
            O programa de investimento e parceria estratégica da Quic.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <nav className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-amber-400 text-white font-medium'
                      : 'border-transparent text-white/40 hover:text-white/65'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="relative">
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-14 sm:py-20">
          <div className="bg-white rounded-2xl px-6 sm:px-10 py-10 border border-stone-100">

            {activeTab === 'golden-circle' && (
              <div>
                <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
                  <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Golden Circle</h2>
                </div>
                <div className="relative w-full aspect-[2000/1414] max-h-[420px] overflow-hidden rounded-xl mb-8">
                  <Image src="/golden.png" alt="Golden Circle" fill priority className="object-cover" />
                </div>
                <p className="text-sm text-stone-500 leading-relaxed mb-6 max-w-2xl">
                  O Golden Circle é o círculo restrito de investidores e parceiros estratégicos da Quic. Damos acesso
                  privilegiado a oportunidades de investimento em produções de eventos e concertos de grande escala,
                  com relatórios de desempenho transparentes e acompanhamento direto da equipa fundadora.
                </p>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src="/golden-circle.mp4"
                  className="w-full max-w-3xl rounded-lg shadow-md mb-8"
                >
                  O seu navegador não suporta reprodução de vídeo.
                </video>
                <button
                  type="button"
                  className="rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
                >
                  Junta-te em Gold
                </button>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-5">
              <Image src="/logo-branco.png" alt="Quic" width={130} height={52} />
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/30 hidden sm:block">
                No Stage Is Too Big
              </span>
            </div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/30">
              Golden Circle · Quic
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
