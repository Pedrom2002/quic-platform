'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Star, TrendingUp, Layers, BarChart3, Brain, Info, KeyRound, Mail,
} from 'lucide-react'

type SectionId =
  | 'golden-circle'
  | 'opportunities'
  | 'how-it-works'
  | 'track-record'
  | 'intelligence'
  | 'about'
  | 'investor-login'

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'golden-circle', label: 'Golden Circle', icon: Star },
  { id: 'opportunities', label: 'Opportunities', icon: TrendingUp },
  { id: 'how-it-works', label: 'How It Works', icon: Layers },
  { id: 'track-record', label: 'Track Record', icon: BarChart3 },
  { id: 'intelligence', label: 'Intelligence', icon: Brain },
  { id: 'about', label: 'About', icon: Info },
  { id: 'investor-login', label: 'Investor Login', icon: KeyRound },
]

function useScrollSpy(ids: SectionId[]): SectionId {
  const [active, setActive] = useState<SectionId>(ids[0])
  const ratios = useRef<Map<SectionId, number>>(new Map())

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          ratios.current.set(entry.target.id as SectionId, entry.intersectionRatio)
        }
        let bestId = active
        let bestRatio = 0
        for (const id of ids) {
          const ratio = ratios.current.get(id) ?? 0
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        }
        if (bestRatio > 0) setActive(bestId)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-80px 0px -60% 0px' }
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return active
}

function scrollToSection(id: SectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function SideNav({ active }: { active: SectionId }) {
  return (
    <nav className="hidden md:block md:sticky md:top-24 md:self-start md:w-48 shrink-0">
      <ul className="space-y-1">
        {SECTIONS.map(section => (
          <li key={section.id}>
            <button
              onClick={() => scrollToSection(section.id)}
              aria-current={active === section.id ? 'true' : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
                active === section.id
                  ? 'bg-stone-900 text-white font-medium'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <section.icon className="w-3.5 h-3.5 shrink-0" />
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function TopNav({ active }: { active: SectionId }) {
  return (
    <div className="md:hidden sticky top-0 z-20 bg-white border-b border-stone-100">
      <nav className="flex overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            aria-current={active === section.id ? 'true' : undefined}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap border-b-2 transition-colors ${
              active === section.id
                ? 'border-amber-400 text-stone-900 font-medium'
                : 'border-transparent text-stone-400'
            }`}
          >
            <section.icon className="w-3 h-3" />
            {section.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function GoldenCirclePublicPage() {
  const active = useScrollSpy(SECTIONS.map(s => s.id))

  return (
    <div className="min-h-screen bg-white">
      {/* ── Compact hero ── */}
      <header
        className="relative"
        style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Image src="/logo-branco.png" alt="Quic" width={110} height={44} priority />
          <span className="text-sm font-semibold text-white">Golden Circle</span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40 hidden sm:block">
            Investor Relations
          </span>
        </div>
      </header>

      <TopNav active={active} />

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-14 flex gap-12">
        <SideNav active={active} />

        <main className="flex-1 min-w-0 space-y-20">

          <section id="golden-circle">
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
          </section>

          <section id="opportunities">
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Opportunities</h2>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-8 max-w-2xl">
              Cada oportunidade de investimento corresponde a um concerto ou produção de evento em preparação,
              com orçamento, capacidade de sala e estimativa de retorno definidos antes da abertura a
              investidores do Golden Circle.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-100 rounded-xl overflow-hidden border border-stone-100">
              {[
                { num: '01', title: 'Concerto Sala Tejo — Nov 2026', body: 'Produção de médio porte, capacidade 4.000 lugares. Ronda de investimento em preparação.' },
                { num: '02', title: 'Digressão Nacional — Q1 2027', body: 'Digressão de 6 datas em 4 cidades. Estrutura de investimento por data ou pacote completo.' },
                { num: '03', title: 'Festival de Verão — 2027', body: 'Produção de grande escala, múltiplos palcos. Oportunidade em fase de estruturação.' },
                { num: '04', title: 'Novas oportunidades', body: 'Novas produções são adicionadas regularmente. Investidores Golden Circle têm acesso antecipado.' },
              ].map((card, i) => (
                <div key={i} className="bg-white p-6">
                  <span className="text-[10px] text-stone-400 tabular-nums tracking-wider block mb-3">{card.num}</span>
                  <p className="text-base font-medium tracking-tight text-stone-900 mb-2">{card.title}</p>
                  <p className="text-sm text-stone-500 leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="how-it-works">
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">How It Works</h2>
            </div>
            <ul>
              {[
                { num: '01', title: 'Torna-te membro Golden Circle', desc: 'Após aprovação, tens acesso à lista de oportunidades de investimento ativas e ao histórico de produções anteriores.' },
                { num: '02', title: 'Escolhes a oportunidade', desc: 'Cada produção tem orçamento, capacidade e retorno estimado definidos. Investes no valor e na produção que preferires.' },
                { num: '03', title: 'Acompanhamento em tempo real', desc: 'Recebes atualizações sobre a produção: vendas de bilhetes, custos, e progresso até ao dia do evento.' },
                { num: '04', title: 'Retorno após o evento', desc: 'Após a produção e o encerramento de contas, o retorno é distribuído aos investidores dessa oportunidade específica.' },
              ].map((step, i) => (
                <li key={i} className="flex gap-6 md:gap-10 py-6 border-b border-stone-100 last:border-0">
                  <span className="text-xs text-stone-400 tabular-nums tracking-wider font-medium pt-0.5 shrink-0 w-6">
                    {step.num}
                  </span>
                  <div>
                    <p className="text-base font-medium tracking-tight text-stone-900 mb-1.5">{step.title}</p>
                    <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section id="track-record">
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Track Record</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-100 rounded-xl overflow-hidden border border-stone-100 mb-8">
              {[
                { value: '40+', label: 'Concertos produzidos' },
                { value: '250k+', label: 'Bilhetes vendidos' },
                { value: '15', label: 'Artistas geridos' },
                { value: '8', label: 'Anos de atividade' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 text-center">
                  <p className="text-3xl font-bold tracking-tight text-stone-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-stone-500">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-stone-500 leading-relaxed max-w-2xl">
              Números indicativos do histórico de produção da Quic. Dados detalhados por produção disponíveis
              para membros Golden Circle mediante pedido.
            </p>
          </section>

          <section id="intelligence">
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Intelligence</h2>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-8 max-w-2xl">
              Análises e tendências da indústria de eventos ao vivo em Portugal, recolhidas pela equipa Quic a
              partir da experiência direta na produção e gestão de concertos.
            </p>
            <div className="divide-y divide-stone-100">
              {[
                { title: 'Crescimento do setor de eventos ao vivo', desc: 'O mercado português de concertos e eventos ao vivo tem vindo a expandir-se de forma consistente nos últimos anos.' },
                { title: 'Procura por experiências premium', desc: 'Segmentos VIP e experiências exclusivas representam uma fatia crescente da receita por evento.' },
                { title: 'Digitalização da bilhética', desc: 'A adoção de plataformas próprias de venda de bilhetes reduz dependência de intermediários e melhora margens.' },
              ].map((item, i) => (
                <div key={i} className="py-5">
                  <p className="text-base font-medium tracking-tight text-stone-900 mb-1.5">{item.title}</p>
                  <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="about">
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">About</h2>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-6 max-w-2xl">
              A Quic é uma plataforma de gestão e produção de eventos ao vivo, cobrindo bilhética, aluguer de
              equipamento, gestão de artistas agenciados e coordenação completa de produções de concertos.
              O Golden Circle nasce da vontade de partilhar o crescimento da empresa com um grupo restrito de
              parceiros e investidores alinhados com a visão de longo prazo da marca.
            </p>
            <p className="text-sm text-stone-500 leading-relaxed max-w-2xl">
              Para mais informações sobre a equipa fundadora e a missão da Quic, contacte-nos diretamente.
            </p>
          </section>

          <section id="investor-login">
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Investor Login</h2>
            </div>
            <div className="bg-stone-50 rounded-xl p-8 border border-stone-200 text-center">
              <KeyRound className="w-6 h-6 text-stone-400 mx-auto mb-4" />
              <p className="text-base font-medium tracking-tight text-stone-900 mb-2">
                Área de investidor brevemente disponível
              </p>
              <p className="text-sm text-stone-500 leading-relaxed mb-6 max-w-md mx-auto">
                Estamos a preparar uma área dedicada para membros Golden Circle com acesso a relatórios
                detalhados por produção. Entretanto, contacte-nos diretamente.
              </p>
              <a
                href="mailto:goldencircle@quic.pt"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-800"
              >
                <Mail className="w-4 h-4" />
                goldencircle@quic.pt
              </a>
            </div>
          </section>

        </main>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-8">
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
