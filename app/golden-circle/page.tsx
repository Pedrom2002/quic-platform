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

            {activeTab === 'opportunities' && (
              <div>
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
              </div>
            )}

            {activeTab === 'how-it-works' && (
              <div>
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
              </div>
            )}

            {activeTab === 'track-record' && (
              <div>
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
              </div>
            )}

            {activeTab === 'intelligence' && (
              <div>
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
              </div>
            )}

            {activeTab === 'about' && (
              <div>
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
              </div>
            )}

            {activeTab === 'investor-login' && (
              <div>
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
