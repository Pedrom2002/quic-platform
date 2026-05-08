'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Link2, CheckSquare, Mail, Lock,
  Bell, Clock, Globe, CheckCircle2,
  MailOpen, Smartphone, Eye, RefreshCw,
  Check, ChevronDown,
} from 'lucide-react'

type Tab = 'visao-geral' | 'portal' | 'notificacoes' | 'etapas' | 'faq'

const TABS: { id: Tab; label: string }[] = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'portal', label: 'O seu portal' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'etapas', label: 'Etapas do evento' },
  { id: 'faq', label: 'Dúvidas frequentes' },
]

interface FlowItem {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  num: string
}

function FlowList({ items }: { items: FlowItem[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i} className="flex gap-6 md:gap-10 py-6 border-b border-stone-100 last:border-0">
          <span className="text-xs text-stone-400 tabular-nums tracking-wider font-medium pt-0.5 shrink-0 w-6">
            {item.num}
          </span>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <item.icon className="w-4 h-4 text-stone-500 shrink-0" />
              <p className="text-base font-medium tracking-tight text-stone-900">{item.title}</p>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-amber-400/60 pl-5 py-2 mt-8">
      <p className="text-sm text-stone-500 leading-relaxed">{children}</p>
    </div>
  )
}

export default function GuiaClientePage() {
  const [activeTab, setActiveTab] = useState<Tab>('visao-geral')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up {
          opacity: 0;
          animation: fade-up 0.9s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* ── Hero ── */}
      <section
        className="relative flex flex-col"
        style={{ background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}
      >
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
          src="/a.mp4"
        />

        {/* Top bar */}
        <div className="relative z-10 border-b border-white/10 anim-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="max-w-5xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
            <Image src="/Design sem nome(1).png" alt="Quic" width={140} height={56} priority />
            <span className="text-[10px] tracking-[0.35em] uppercase text-white/30 hidden sm:block">
              No Stage Is Too Big
            </span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-12 sm:py-16">
          <p
            className="text-[10px] font-medium tracking-[0.4em] uppercase text-white/40 mb-5 anim-fade-up"
            style={{ animationDelay: '300ms' }}
          >
            Guia do Cliente
          </p>
          <h1
            className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.0] mb-5 anim-fade-up"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif', animationDelay: '500ms' }}
          >
            Como funciona<br />a plataforma
          </h1>
          <p
            className="text-white/45 text-sm leading-relaxed max-w-xs anim-fade-up"
            style={{ animationDelay: '700ms' }}
          >
            Tudo o que precisa saber sobre o acompanhamento do seu evento na Quic.
          </p>
        </div>

        {/* Tab nav */}
        <div
          className="relative z-10 border-t border-white/10 anim-fade-up"
          style={{ animationDelay: '800ms' }}
        >
          <div className="max-w-5xl mx-auto px-6 md:px-12">
            <nav className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-4 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-white text-white font-medium'
                      : 'border-transparent text-white/40 hover:text-white/65'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="relative">
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-30"
          src="/b.mp4"
        />
        <div className="absolute inset-0 bg-white/60 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-14 sm:py-20">
          <div className="bg-white/75 backdrop-blur-md rounded-2xl px-6 sm:px-10 py-10">

            {/* Visão Geral */}
            {activeTab === 'visao-geral' && (
              <div>
                <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
                  <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Visão Geral</h2>
                  <span className="text-xs text-stone-400 tabular-nums">04</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-100 rounded-xl overflow-hidden border border-stone-100">
                  {[
                    { icon: Link2, num: '01', title: 'Acesso por link', body: 'Recebe um link pessoal por email. Não precisa de criar conta nem de se lembrar de passwords.' },
                    { icon: CheckSquare, num: '02', title: 'Checklist em tempo real', body: 'Acompanha ao vivo o progresso do seu evento — cada etapa concluída aparece actualizada de imediato.' },
                    { icon: Mail, num: '03', title: 'Avisos automáticos', body: 'Recebe emails automáticos quando há novidades relevantes, sem precisar de verificar a plataforma.' },
                    { icon: Lock, num: '04', title: 'Acesso privado', body: 'O seu portal é exclusivo e só acessível através do seu link pessoal. Os dados são protegidos.' },
                  ].map((card, i) => (
                    <div key={i} className="bg-white p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] text-stone-400 tabular-nums tracking-wider">{card.num}</span>
                        <card.icon className="w-4 h-4 text-stone-500" />
                      </div>
                      <p className="text-base font-medium tracking-tight text-stone-900 mb-2">{card.title}</p>
                      <p className="text-sm text-stone-500 leading-relaxed">{card.body}</p>
                    </div>
                  ))}
                </div>
                <TipBox>
                  <span className="font-semibold text-stone-800">Em resumo:</span> a equipa Quic gere tudo internamente e vai actualizando o estado do seu evento. O cliente acompanha tudo pelo portal e recebe notificações automáticas por email.
                </TipBox>
              </div>
            )}

            {/* Portal */}
            {activeTab === 'portal' && (
              <div>
                <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
                  <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">O Seu Portal</h2>
                </div>

                {/* Demo */}
                <div className="bg-stone-50 rounded-xl p-5 mb-10 border border-stone-200">
                  <div className="flex items-center gap-2 mb-5 pb-4 border-b border-stone-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-medium tracking-widest uppercase text-stone-600">Portal — Casamento Silva &amp; Ferreira</span>
                    <span className="ml-auto text-xs text-stone-400">actualizado agora</span>
                  </div>
                  <ul className="space-y-2">
                    {[
                      { label: 'Contrato assinado', state: 'done' },
                      { label: 'Menu de degustação confirmado', state: 'done' },
                      { label: 'Confirmação de fornecedores', state: 'progress' },
                      { label: 'Ensaio e coordenação final', state: 'pending' },
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-4 py-2.5">
                        {item.state === 'done'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : item.state === 'progress'
                          ? <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />}
                        <span className={`text-sm flex-1 ${item.state === 'done' ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                          {item.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide ${
                          item.state === 'done' ? 'bg-emerald-50 text-emerald-700' :
                          item.state === 'progress' ? 'bg-amber-50 text-amber-700' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {item.state === 'done' ? 'Concluído' : item.state === 'progress' ? 'Em curso' : 'Pendente'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <FlowList items={[
                  { icon: MailOpen, num: '01', title: 'Recebe o link por email', desc: 'Logo após contratar os serviços Quic, recebe um email com o seu link de acesso pessoal e intransmissível.' },
                  { icon: Smartphone, num: '02', title: 'Abre em qualquer dispositivo', desc: 'O portal funciona no telemóvel, tablet ou computador — sem aplicação para instalar.' },
                  { icon: Eye, num: '03', title: 'Vê apenas o que lhe diz respeito', desc: 'Só aparecem as etapas marcadas como visíveis para o cliente — sem informação interna da equipa.' },
                  { icon: RefreshCw, num: '04', title: 'Actualizações em tempo real', desc: 'Quando a equipa conclui uma etapa, o portal actualiza automaticamente. Não precisa de recarregar.' },
                ]} />
              </div>
            )}

            {/* Notificações */}
            {activeTab === 'notificacoes' && (
              <div>
                <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
                  <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Notificações</h2>
                </div>
                <FlowList items={[
                  { icon: Bell, num: '01', title: 'Quando recebo um email de notificação?', desc: 'Sempre que a equipa Quic conclui uma etapa relevante para si, é enviado automaticamente um email de aviso para o endereço que forneceu.' },
                  { icon: Clock, num: '02', title: 'Os emails podem ser imediatos ou agendados', desc: 'Algumas notificações são enviadas no momento; outras podem ser programadas para um horário mais adequado (por exemplo, de manhã).' },
                  { icon: Globe, num: '03', title: 'Conteúdo personalizado', desc: 'Os emails utilizam o seu nome e os detalhes do evento, sendo enviados no idioma configurado para o seu perfil.' },
                  { icon: CheckCircle2, num: '04', title: 'Confirmação de entrega', desc: 'A plataforma regista automaticamente se o email chegou com sucesso. Em caso de problema, a equipa é alertada.' },
                ]} />
                <TipBox>
                  <span className="font-semibold text-stone-800">Dica:</span> se não receber um email esperado, verifique a pasta de spam ou lixo electrónico. O remetente será sempre um endereço oficial da Quic.
                </TipBox>
              </div>
            )}

            {/* Etapas */}
            {activeTab === 'etapas' && (
              <div>
                <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
                  <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Etapas do Evento</h2>
                  <span className="text-xs text-stone-400 tabular-nums">05</span>
                </div>
                <ul>
                  {[
                    { done: true, title: 'Contratação e configuração inicial', desc: 'A equipa cria o seu evento na plataforma, configura a checklist personalizada e envia-lhe o link do portal.', tag: 'Feito pela equipa' },
                    { done: false, title: 'Acompanhamento activo', desc: 'À medida que os preparativos avançam, cada etapa é marcada como concluída. O portal reflecte o progresso em tempo real.', tag: 'Actualizações automáticas' },
                    { done: false, title: 'Confirmações e fornecedores', desc: 'Quando fornecedores, menus ou detalhes logísticos são confirmados, a etapa correspondente é actualizada.', tag: 'Visível no portal' },
                    { done: false, title: 'Coordenação final', desc: 'Nos dias anteriores ao evento, as últimas etapas ficam visíveis e o estado é actualizado conforme se conclui.', tag: 'Próxima etapa' },
                    { done: false, title: 'Dia do evento', desc: 'A checklist estará completa e o portal serve como confirmação de que tudo foi tratado. A equipa coordena tudo no terreno.', tag: 'Evento realizado' },
                  ].map((step, i) => (
                    <li
                      key={i}
                      className={`flex gap-6 md:gap-10 py-6 border-l-2 pl-6 border-b border-stone-100 last:border-b-0 mb-0 ${
                        step.done ? 'border-l-amber-400' : 'border-l-stone-200'
                      }`}
                    >
                      <span className="text-xs text-stone-400 tabular-nums tracking-wider font-medium pt-0.5 shrink-0 w-5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          {step.done
                            ? <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            : <div className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0" />}
                          <p className="text-base font-medium tracking-tight text-stone-900">{step.title}</p>
                        </div>
                        <p className="text-sm text-stone-500 leading-relaxed mb-3">{step.desc}</p>
                        <span className="text-[10px] tracking-widest uppercase text-stone-400 border border-stone-200 rounded-full px-3 py-1">
                          {step.tag}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQ */}
            {activeTab === 'faq' && (
              <div>
                <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
                  <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">Dúvidas Frequentes</h2>
                  <span className="text-xs text-stone-400 tabular-nums">06</span>
                </div>
                <div className="divide-y divide-stone-100">
                  {[
                    { q: 'O link expira?', a: 'O link do portal é válido por 90 dias a partir da data de emissão. Se precisar de acesso após esse período, contacte a equipa Quic para renovação.' },
                    { q: 'Posso partilhar o link com alguém?', a: 'Tecnicamente é possível, mas o link é pessoal e dá acesso a informação privada do seu evento. Recomendamos que não o partilhe com terceiros fora do núcleo de organização.' },
                    { q: 'Porque é que não vejo todas as etapas?', a: 'A equipa Quic define quais as etapas visíveis para o cliente. Algumas etapas são internas e não aparecem no portal para não sobrecarregar a informação.' },
                    { q: 'Não recebi o email de notificação, o que faço?', a: 'Verifique primeiro a pasta de spam ou promoções. Se o email continuar em falta, pode sempre ver o estado actualizado directamente no portal. Contacte a equipa se o problema persistir.' },
                    { q: 'Posso fazer alterações ao evento pelo portal?', a: 'Não. O portal do cliente é de consulta. Para qualquer alteração ou pedido, deve contactar directamente a equipa Quic pelos canais habituais (email, telefone).' },
                    { q: 'A informação é segura?', a: 'Sim. O acesso é protegido por um token criptográfico único. Apenas quem tiver o seu link pessoal consegue aceder. A plataforma utiliza HTTPS e não armazena passwords.' },
                  ].map((item, i) => (
                    <div key={i}>
                      <button
                        className="w-full flex items-center justify-between py-5 text-left group"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span className="text-base font-medium tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
                          {item.q}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq === i && (
                        <p className="text-sm text-stone-500 leading-relaxed pb-5">{item.a}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-5">
              <Image src="/Design sem nome(1).png" alt="Quic" width={120} height={48} />
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/30 hidden sm:block">
                No Stage Is Too Big
              </span>
            </div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/30">
              Guia do Cliente · Quic
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
