'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Star, TrendingUp, Layers, BarChart3, Info, KeyRound, Mail,
} from 'lucide-react'

type SectionId =
  | 'golden-circle'
  | 'oportunidades'
  | 'track-record'
  | 'como-funciona'
  | 'sobre'
  | 'investidor-login'

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'golden-circle', label: 'Golden Circle', icon: Star },
  { id: 'oportunidades', label: 'Oportunidades', icon: TrendingUp },
  { id: 'como-funciona', label: 'Como Funciona', icon: Layers },
  { id: 'sobre', label: 'Sobre', icon: Info },
  { id: 'investidor-login', label: 'Acesso Investidor', icon: KeyRound },
  { id: 'track-record', label: 'Histórico', icon: BarChart3 },
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
      { threshold: [0.2], rootMargin: '-100px 0px -50% 0px' }
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

function useRevealOnScroll(ids: SectionId[]): Set<SectionId> {
  // Lido uma vez no mount (mesmo padrao do useTypewriterLoop acima), para
  // decidir already-revealed sem um setState sincrono dentro do efeito.
  const reduced = prefersReducedMotion()
  const [revealed, setRevealed] = useState<Set<SectionId>>(() => (reduced ? new Set(ids) : new Set()))

  useEffect(() => {
    if (reduced) return

    const observer = new IntersectionObserver(
      entries => {
        setRevealed(prev => {
          const next = new Set(prev)
          let changed = false
          for (const entry of entries) {
            if (entry.isIntersecting) {
              next.add(entry.target.id as SectionId)
              changed = true
              observer.unobserve(entry.target)
            }
          }
          return changed ? next : prev
        })
      },
      { threshold: 0.15 }
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return revealed
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useCountUp(target: number, active: boolean, durationMs = 1400): number {
  const reduced = prefersReducedMotion()
  const [value, setValue] = useState(target)

  useEffect(() => {
    if (!active || reduced) return

    const start = performance.now()
    let frameId: number

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return value
}

function useTypewriterLoop(phrases: string[]): string {
  // `reduced` e lido uma vez no mount (nao dentro do efeito), por isso um
  // toggle do reduced-motion do SO a meio da sessao nao para a animacao ja
  // em curso — tradeoff aceitavel para o alcance desta pagina.
  const reduced = prefersReducedMotion()
  const [display, setDisplay] = useState(reduced ? phrases[0] : '')

  useEffect(() => {
    if (reduced) return

    let phraseIndex = 0
    let charIndex = 0
    let mode: 'typing' | 'pausing' | 'deleting' = 'typing'
    let timeoutId: number

    function step() {
      const current = phrases[phraseIndex]

      if (mode === 'typing') {
        charIndex++
        setDisplay(current.slice(0, charIndex))
        if (charIndex >= current.length) {
          mode = 'pausing'
          timeoutId = window.setTimeout(step, 1500)
          return
        }
        timeoutId = window.setTimeout(step, 35)
        return
      }

      if (mode === 'pausing') {
        mode = 'deleting'
        timeoutId = window.setTimeout(step, 35)
        return
      }

      // deleting
      charIndex--
      setDisplay(current.slice(0, charIndex))
      if (charIndex <= 0) {
        phraseIndex = (phraseIndex + 1) % phrases.length
        mode = 'typing'
      }
      timeoutId = window.setTimeout(step, 25)
    }

    timeoutId = window.setTimeout(step, 35)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return display
}

function scrollToSection(id: SectionId) {
  const el = document.getElementById(id)
  if (!el) return
  const offset = 100
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: 'smooth' })
}

function revealClass(revealed: boolean): string {
  return revealed
    ? 'opacity-100'
    : 'opacity-0'
}

function SideNav({ active }: { active: SectionId }) {
  return (
    <nav className="hidden md:block md:sticky md:top-8 md:self-start md:w-48 shrink-0" aria-label="Navegação principal">
      <ul className="space-y-1">
        {SECTIONS.map(section => (
          <li key={section.id}>
            <button
              onClick={() => scrollToSection(section.id)}
              aria-current={active === section.id ? 'page' : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--quic-magenta)] ${
                active === section.id
                  ? 'bg-[var(--quic-magenta)] text-white font-medium'
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
      <nav className="flex overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }} aria-label="Navegação principal">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            aria-current={active === section.id ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--quic-magenta)] ${
              active === section.id
                ? 'border-[var(--quic-magenta)] text-stone-900 font-medium'
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

function TrackRecordStat({ target, suffix, label, active }: { target: number; suffix: string; label: string; active: boolean }) {
  const value = useCountUp(target, active)
  return (
    <div className="p-6 text-center" style={{ background: '#141318' }}>
      <p className="text-5xl sm:text-6xl font-bold tracking-tight text-[var(--quic-magenta)] mb-1 tabular-nums">
        {value}{suffix}
      </p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  )
}

const TRACK_RECORD_STATS = [
  { target: 40, suffix: '+', label: 'Concertos produzidos' },
  { target: 250, suffix: 'k+', label: 'Bilhetes vendidos' },
  { target: 15, suffix: '', label: 'Artistas geridos' },
  { target: 8, suffix: '', label: 'Anos de atividade' },
]

const OPPORTUNITY_CARDS = [
  { num: '01', title: 'Concerto Sala Tejo — Nov 2026', body: 'Produção de médio porte, capacidade 4.000 lugares. Ronda de investimento em preparação.', status: 'Em preparação' },
  { num: '02', title: 'Digressão Nacional — Q1 2027', body: 'Digressão de 6 datas em 4 cidades. Estrutura de investimento por data ou pacote completo.', status: 'Em preparação' },
  { num: '03', title: 'Festival de Verão — 2027', body: 'Produção de grande escala, múltiplos palcos. Oportunidade em fase de estruturação.', status: 'Em estruturação' },
  { num: '04', title: 'Novas oportunidades', body: 'Novas produções são adicionadas regularmente. Investidores Golden Circle têm acesso antecipado.', status: 'Em breve' },
]

const HERO_PHRASES = [
  'O futuro dos concertos em Portugal.',
  'Investe em produções reais.',
  'Junta-te ao Golden Circle.',
]

const LONGEST_HERO_PHRASE = HERO_PHRASES.reduce((a, b) => (b.length > a.length ? b : a))

export default function GoldenCirclePublicPage() {
  const active = useScrollSpy(SECTIONS.map(s => s.id))
  const revealed = useRevealOnScroll(SECTIONS.map(s => s.id))
  const title = useTypewriterLoop(HERO_PHRASES)

  return (
    <div className="min-h-screen bg-white overflow-x-clip">
      {/* ── Hero ── */}
      <style>{`
        @keyframes golden-circle-sweep {
          0% { background-position: -50% -50%; }
          50% { background-position: 150% 150%; }
          100% { background-position: -50% -50%; }
        }
      `}</style>
      <header
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src="/Video Golden Circle com Logo Novo.mp4"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, rgba(13,12,13,0.55) 0%, rgba(26,26,26,0.45) 50%, rgba(13,12,13,0.55) 100%)' }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(149,27,129,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(149,27,129,.3) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(115deg, transparent 40%, rgba(149,27,129,.4) 50%, transparent 60%)',
            backgroundSize: '250% 250%',
            animation: prefersReducedMotion() ? 'none' : 'golden-circle-sweep 12s ease-in-out infinite',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-1/3 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(149,27,129,0.6) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 md:px-12 py-14 md:py-20">
          <Image src="/logo-branco.png" alt="Quic" width={110} height={44} priority className="mb-10" />
          <p className="inline-flex items-center gap-2 text-sm md:text-base font-semibold tracking-[0.3em] uppercase text-[#d18cc5] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d18cc5]" />
            Golden Circle
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.05] max-w-3xl" style={{ height: '1.35em' }}>
            {title || HERO_PHRASES[0]}
          </h1>
          <button
            onClick={() => scrollToSection('golden-circle')}
            aria-label="Ir para Golden Circle — Saiba mais sobre oportunidades de investimento"
            className="mt-12 flex items-center gap-3 px-4 py-2.5 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[var(--quic-magenta)] rounded-full hover:bg-[var(--quic-magenta-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            Descobrir
            <span className="block w-px h-6 bg-white/40" />
          </button>
        </div>
      </header>

      <TopNav active={active} />

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-14 flex gap-12">
        <SideNav active={active} />

        <main className="flex-1 min-w-0 space-y-20">

          <section
            id="golden-circle"
            className={`transition-all duration-700 ${revealClass(revealed.has('golden-circle'))}`}
          >
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Golden Circle</h2>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-6 max-w-2xl">
              O Golden Circle é o círculo restrito de investidores e parceiros estratégicos da Quic. Damos acesso
              privilegiado a oportunidades de investimento em produções de eventos e concertos de grande escala,
              com relatórios de desempenho transparentes e acompanhamento direto da equipa fundadora.
            </p>
            <figure className="w-full max-w-3xl mb-8 relative">
              <img
                src="/logo-positivonegativo.png"
                alt="Golden Circle"
                className="w-full rounded-lg shadow-md"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
              <video
                controls
                playsInline
                preload="none"
                poster="/logo-positivonegativo.png"
                src="/golden-circle.mp4"
                className="absolute inset-0 w-full h-full rounded-lg"
                style={{ aspectRatio: '16/9' }}
              >
                <source src="/golden-circle.mp4" type="video/mp4" />
                O seu navegador não suporta reprodução de vídeo.
              </video>
              <figcaption className="text-sm text-stone-500 mt-3 text-center">
                Vídeo introdutório sobre o Golden Circle: investimento em produções de eventos reais,
                relatórios transparentes e acesso a oportunidades qualificadas.
              </figcaption>
            </figure>
          </section>

          <section
            id="oportunidades"
            className={`transition-all duration-700 ${revealClass(revealed.has('oportunidades'))}`}
          >
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Oportunidades</h2>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-8 max-w-2xl">
              Oportunidades detalhadas estão restritas a membros aprovados do Golden Circle, após assinatura
              de NDA e processo de qualificação. Este espaço apresenta apenas o processo geral de candidatura.
            </p>
            <div className="bg-stone-50 rounded-xl p-8 border border-stone-200">
              <p className="text-sm text-stone-600 leading-relaxed mb-6">
                O processo segue três etapas:
              </p>
              <ol className="space-y-3 list-decimal list-inside text-sm text-stone-700">
                <li>Candidatura e qualificação inicial</li>
                <li>Assinatura de NDA e processo KYC</li>
                <li>Acesso a Dashboard privado com oportunidades qualificadas</li>
              </ol>
              <button
                onClick={() => scrollToSection('investidor-login')}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--quic-magenta)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--quic-magenta-hover)]"
              >
                Solicitar Convite
              </button>
            </div>
          </section>

          <section
            id="como-funciona"
            className={`transition-all duration-700 ${revealClass(revealed.has('como-funciona'))}`}
          >
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Como Funciona</h2>
            </div>
            <ul className="relative">
              <span
                aria-hidden="true"
                className="hidden sm:block absolute left-[15px] top-4 bottom-4 w-px bg-stone-200"
              />
              {[
                { num: '01', title: 'Torna-te membro Golden Circle', desc: 'Após aprovação, tens acesso à lista de oportunidades de investimento ativas e ao histórico de produções anteriores.' },
                { num: '02', title: 'Escolhes a oportunidade', desc: 'Cada produção tem orçamento, capacidade e retorno estimado definidos. Investes no valor e na produção que preferires.' },
                { num: '03', title: 'Acompanhamento em tempo real', desc: 'Recebes atualizações sobre a produção: vendas de bilhetes, custos, e progresso até ao dia do evento.' },
                { num: '04', title: 'Retorno após o evento', desc: 'Após a produção e o encerramento de contas, o retorno é distribuído aos investidores dessa oportunidade específica.' },
              ].map((step, i) => (
                <li key={i} className="relative flex gap-6 md:gap-10 py-6 border-b border-stone-100 last:border-0">
                  <span className="relative z-10 flex items-center justify-center text-xs text-stone-400 tabular-nums tracking-wider font-semibold shrink-0 w-8 h-8 rounded-full border border-stone-200 bg-white">
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

          <section
            id="sobre"
            className={`transition-all duration-700 ${revealClass(revealed.has('sobre'))}`}
          >
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Sobre</h2>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-stone-900 mb-3">Quem Somos</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  A Quic é uma produtora de entretenimento portuguesa com tecnologia própria. Atuamos em três áreas
                  complementares: bilhética integrada, gestão de eventos e coordenação de grandes produções de concertos.
                  Somos um agente diferenciador no mercado português de eventos ao vivo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-3">Experiência Comprovada</h3>
                  <ul className="text-sm text-stone-500 leading-relaxed space-y-2">
                    <li className="flex gap-3">
                      <span className="text-[var(--quic-magenta)] font-bold shrink-0">40+</span>
                      <span>Produções executadas com sucesso</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[var(--quic-magenta)] font-bold shrink-0">250k+</span>
                      <span>Bilhetes comercializados</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[var(--quic-magenta)] font-bold shrink-0">15+</span>
                      <span>Artistas em carteira</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[var(--quic-magenta)] font-bold shrink-0">8</span>
                      <span>Anos de operação contínua</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-3">O Que Oferecemos</h3>
                  <ul className="text-sm text-stone-500 leading-relaxed space-y-2 list-disc list-inside">
                    <li>Bilhética integrada com analytics em tempo real</li>
                    <li>Gestão operacional completa de eventos</li>
                    <li>Coordenação de produção de concertos de grande escala</li>
                    <li>Acesso a artistas curados da equipa</li>
                    <li>Relatórios de desempenho transparentes</li>
                  </ul>
                </div>
              </div>

              <blockquote className="border-l-4 border-[var(--quic-magenta)] pl-6 py-2 bg-stone-50 rounded-r-lg">
                <p className="text-base md:text-lg font-medium italic text-stone-800">
                  &ldquo;O Golden Circle nasce da vontade de partilhar o crescimento da empresa com um grupo
                  restrito de parceiros que compreendem o valor da produção de qualidade e estão alinhados com a nossa
                  visão de longo prazo no mercado de eventos em Portugal.&rdquo;
                </p>
              </blockquote>

              <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-stone-900 mb-3">Por Que Golden Circle?</h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  Convidamos investidores qualificados a fazer parte de uma estrutura exclusiva que combina:
                </p>
                <ul className="text-sm text-stone-600 space-y-2 list-disc list-inside">
                  <li><strong>Transparência:</strong> Acesso a dados operacionais, financeiros e de mercado</li>
                  <li><strong>Alinhamento:</strong> Participação em decisões estratégicas de produção</li>
                  <li><strong>Retorno:</strong> Distribuição de lucros diretos vinculada ao desempenho</li>
                  <li><strong>Acesso:</strong> Convites exclusivos a eventos, previews e networking</li>
                </ul>
              </div>
            </div>
          </section>

          <section
            id="investidor-login"
            className={`transition-all duration-700 ${revealClass(revealed.has('investidor-login'))}`}
          >
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Acesso Investidor</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-stone-50 rounded-xl p-8 border border-stone-200">
                <KeyRound className="w-6 h-6 text-[var(--quic-magenta)] mb-4" />
                <p className="text-base font-medium tracking-tight text-stone-900 mb-3">
                  Já é membro?
                </p>
                <p className="text-sm text-stone-500 leading-relaxed mb-6">
                  Aceda ao seu Dashboard privado para consultar oportunidades qualificadas, relatórios
                  de bilheteira e histórico de investimentos.
                </p>
                <a
                  href="/investors/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--quic-magenta)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--quic-magenta-hover)]"
                >
                  <KeyRound className="w-4 h-4" />
                  Entrar
                </a>
              </div>
              <div className="bg-stone-50 rounded-xl p-8 border border-stone-200">
                <Mail className="w-6 h-6 text-[var(--quic-magenta)] mb-4" />
                <p className="text-base font-medium tracking-tight text-stone-900 mb-3">
                  Solicitar Convite
                </p>
                <p className="text-sm text-stone-500 leading-relaxed mb-6">
                  Se é investidor qualificado e pretende informações sobre o Golden Circle,
                  preencha o formulário para iniciar o processo de candidatura e qualificação.
                </p>
                <a
                  href="/golden-circle/apply"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--quic-magenta)] text-[var(--quic-magenta)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--quic-magenta)] hover:text-white"
                >
                  <Mail className="w-4 h-4" />
                  Solicitar Acesso
                </a>
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* ── Track Record (full-bleed, dark) ── */}
      <section
        id="track-record"
        className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen transition-all duration-700 ${revealClass(revealed.has('track-record'))}`}
        style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-white/10">
            <h2 className="text-2xl font-bold tracking-tight text-white">Track Record</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden mb-8">
            {TRACK_RECORD_STATS.map((stat, i) => (
              <TrackRecordStat key={i} target={stat.target} suffix={stat.suffix} label={stat.label} active={revealed.has('track-record')} />
            ))}
          </div>
          <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
            Números comprovados do histórico de produção da Quic, auditados e validados.
            Dados detalhados por produção e relatórios financeiros disponíveis apenas para membros
            aprovados do Golden Circle, mediante assinatura de NDA.
          </p>
        </div>
      </section>


      {/* ── Footer ── */}
      <footer style={{ background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-white/10">
            <div>
              <Image src="/logo-branco.png" alt="Quic" width={130} height={52} className="mb-4" />
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/30">
                No Stage Is Too Big
              </p>
            </div>
            <div className="text-sm text-white/50">
              <p className="font-semibold text-white mb-3">Contacte-nos</p>
              <p>Email: <a href="mailto:goldencircle@quic.pt" className="text-white/70 hover:text-white">goldencircle@quic.pt</a></p>
              <p>Escritório: <a href="https://quic.pt" className="text-white/70 hover:text-white">quic.pt</a></p>
            </div>
            <div className="text-sm text-white/50">
              <p className="font-semibold text-white mb-3">Legal</p>
              <ul className="space-y-1.5">
                <li><a href="/privacy-policy" className="text-white/70 hover:text-white">Política de Privacidade</a></li>
                <li><a href="/terms" className="text-white/70 hover:text-white">Termos de Serviço</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10">
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/30">
              © 2024 Quic. Golden Circle™ — Todos os direitos reservados.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
