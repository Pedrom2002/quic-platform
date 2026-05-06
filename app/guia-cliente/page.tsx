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

const FLOW_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  teal: 'bg-emerald-50 text-emerald-700',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-700',
  purple: 'bg-violet-50 text-violet-700',
}

interface FlowItem {
  icon: React.ComponentType<{ className?: string }>
  color: string
  title: string
  desc: string
}

function FlowList({ items }: { items: FlowItem[] }) {
  return (
    <div className="divide-y divide-stone-100">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 py-5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${FLOW_COLORS[item.color]}`}>
            <item.icon className="w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 mb-1">{item.title}</p>
            <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-emerald-400/70 pl-4 py-1 mt-8">
      <p className="text-sm text-stone-500 leading-relaxed">{children}</p>
    </div>
  )
}

export default function GuiaClientePage() {
  const [activeTab, setActiveTab] = useState<Tab>('visao-geral')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen" style={{ background: '#f8f7f5' }}>

      {/* ── Dark header ── */}
      <header style={{ background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}>
        <div className="max-w-4xl mx-auto px-6 md:px-10">

          {/* Top bar */}
          <div className="flex items-center justify-between py-5 border-b border-white/10">
            <Image
              src="/Design sem nome(1).png"
              alt="Quic"
              width={150}
              height={60}
              priority
            />
            <span className="text-[10px] tracking-[0.35em] uppercase text-white/30 hidden sm:block">
              No Stage Is Too Big
            </span>
          </div>

          {/* Hero text */}
          <div className="py-4 sm:py-5">
            <p className="text-[10px] font-medium tracking-[0.4em] uppercase text-white/40 mb-2">
              Guia do Cliente
            </p>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-[1.0] mb-2"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            >
              Como funciona a plataforma
            </h1>
            <p className="text-white/45 text-sm leading-relaxed max-w-sm">
              Tudo o que precisa saber sobre o acompanhamento do seu evento na Quic.
            </p>
          </div>

          {/* Tab nav */}
          <nav className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
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
      </header>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-6 md:px-10 py-10 sm:py-12">

        {/* Visão geral */}
        {activeTab === 'visao-geral' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {[
                {
                  icon: Link2,
                  title: 'Acesso por link',
                  body: 'Recebe um link pessoal por email. Não precisa de criar conta nem de se lembrar de passwords.',
                },
                {
                  icon: CheckSquare,
                  title: 'Checklist em tempo real',
                  body: 'Acompanha ao vivo o progresso do seu evento — cada etapa concluída aparece actualizada de imediato.',
                },
                {
                  icon: Mail,
                  title: 'Avisos automáticos',
                  body: 'Recebe emails automáticos quando há novidades relevantes, sem precisar de verificar a plataforma.',
                },
                {
                  icon: Lock,
                  title: 'Acesso privado',
                  body: 'O seu portal é exclusivo e só acessível através do seu link pessoal. Os dados são protegidos.',
                },
              ].map((card, i) => (
                <div key={i} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
                  <card.icon className="w-[18px] h-[18px] text-stone-700 mb-3" />
                  <p className="text-sm font-semibold text-stone-900 mb-2">{card.title}</p>
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
            {/* Demo checklist */}
            <div className="bg-stone-100 rounded-xl p-5 mb-8 border border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-sm font-semibold text-stone-900">Portal — Casamento Silva &amp; Ferreira</span>
                <span className="ml-auto text-xs text-stone-400 shrink-0">actualizado agora</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Contrato assinado', state: 'done' },
                  { label: 'Menu de degustação confirmado', state: 'done' },
                  { label: 'Confirmação de fornecedores', state: 'progress' },
                  { label: 'Ensaio e coordenação final', state: 'pending' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg px-4 py-2.5 shadow-sm">
                    {item.state === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : item.state === 'progress' ? (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${item.state === 'done' ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                      {item.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      item.state === 'done' ? 'bg-emerald-50 text-emerald-700' :
                      item.state === 'progress' ? 'bg-amber-50 text-amber-700' :
                      'bg-stone-100 text-stone-500 border border-stone-200'
                    }`}>
                      {item.state === 'done' ? 'Concluído' : item.state === 'progress' ? 'Em curso' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <FlowList items={[
              { icon: MailOpen, color: 'blue', title: 'Recebe o link por email', desc: 'Logo após contratar os serviços Quic, recebe um email com o seu link de acesso pessoal e intransmissível.' },
              { icon: Smartphone, color: 'teal', title: 'Abre em qualquer dispositivo', desc: 'O portal funciona no telemóvel, tablet ou computador — sem aplicação para instalar.' },
              { icon: Eye, color: 'green', title: 'Vê apenas o que lhe diz respeito', desc: 'Só aparecem as etapas marcadas como visíveis para o cliente — sem informação interna da equipa.' },
              { icon: RefreshCw, color: 'purple', title: 'Actualizações em tempo real', desc: 'Quando a equipa conclui uma etapa, o portal actualiza automaticamente. Não precisa de recarregar a página.' },
            ]} />
          </div>
        )}

        {/* Notificações */}
        {activeTab === 'notificacoes' && (
          <div>
            <FlowList items={[
              { icon: Bell, color: 'blue', title: 'Quando recebo um email de notificação?', desc: 'Sempre que a equipa Quic conclui uma etapa relevante para si, é enviado automaticamente um email de aviso para o endereço que forneceu.' },
              { icon: Clock, color: 'amber', title: 'Os emails podem ser imediatos ou agendados', desc: 'Algumas notificações são enviadas no momento; outras podem ser programadas para um horário mais adequado (por exemplo, de manhã).' },
              { icon: Globe, color: 'teal', title: 'Conteúdo personalizado', desc: 'Os emails utilizam o seu nome e os detalhes do evento, sendo enviados no idioma configurado para o seu perfil.' },
              { icon: CheckCircle2, color: 'green', title: 'Confirmação de entrega', desc: 'A plataforma regista automaticamente se o email chegou com sucesso. Em caso de problema, a equipa é alertada.' },
            ]} />
            <TipBox>
              <span className="font-semibold text-stone-800">Dica:</span> se não receber um email esperado, verifique a pasta de spam ou lixo electrónico. O remetente será sempre um endereço oficial da Quic.
            </TipBox>
          </div>
        )}

        {/* Etapas */}
        {activeTab === 'etapas' && (
          <div className="divide-y divide-stone-100">
            {[
              {
                num: null,
                done: true,
                title: 'Contratação e configuração inicial',
                desc: 'A equipa cria o seu evento na plataforma, configura a checklist personalizada e envia-lhe o link do portal.',
                tag: 'Feito pela equipa',
                tagColor: 'blue',
              },
              {
                num: '2',
                done: false,
                title: 'Acompanhamento activo',
                desc: 'À medida que os preparativos avançam, cada etapa é marcada como concluída. O portal reflecte o progresso em tempo real e recebe notificações por email.',
                tag: 'Actualizações automáticas',
                tagColor: 'blue',
              },
              {
                num: '3',
                done: false,
                title: 'Confirmações e fornecedores',
                desc: 'Quando fornecedores, menus ou detalhes logísticos são confirmados, a etapa correspondente é actualizada e poderá receber notificação.',
                tag: 'Visível no portal',
                tagColor: 'teal',
              },
              {
                num: '4',
                done: false,
                title: 'Coordenação final',
                desc: 'Nos dias anteriores ao evento, as últimas etapas (ensaio, alinhamentos finais) ficam visíveis e o estado é actualizado conforme se conclui.',
                tag: 'Próxima etapa',
                tagColor: 'amber',
              },
              {
                num: '5',
                done: false,
                title: 'Dia do evento',
                desc: 'A checklist estará completa e o portal serve como confirmação de que tudo foi tratado. A equipa coordena tudo no terreno.',
                tag: 'Evento realizado',
                tagColor: 'teal',
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 py-6">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold border ${
                  step.done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}>
                  {step.done ? <Check className="w-3.5 h-3.5" /> : step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 mb-1">{step.title}</p>
                  <p className="text-sm text-stone-500 leading-relaxed mb-3">{step.desc}</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    step.tagColor === 'blue' ? 'bg-blue-50 text-blue-700' :
                    step.tagColor === 'teal' ? 'bg-emerald-50 text-emerald-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {step.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="divide-y divide-stone-100">
            {[
              {
                q: 'O link expira?',
                a: 'O link do portal é válido por 90 dias a partir da data de emissão. Se precisar de acesso após esse período, contacte a equipa Quic para renovação.',
              },
              {
                q: 'Posso partilhar o link com alguém?',
                a: 'Tecnicamente é possível, mas o link é pessoal e dá acesso a informação privada do seu evento. Recomendamos que não o partilhe com terceiros fora do núcleo de organização.',
              },
              {
                q: 'Porque é que não vejo todas as etapas?',
                a: 'A equipa Quic define quais as etapas visíveis para o cliente. Algumas etapas são internas (contacto com fornecedores, gestão administrativa) e não aparecem no portal para não sobrecarregar a informação.',
              },
              {
                q: 'Não recebi o email de notificação, o que faço?',
                a: 'Verifique primeiro a pasta de spam ou promoções. Se o email continuar em falta, pode sempre ver o estado actualizado directamente no portal. Contacte a equipa se o problema persistir.',
              },
              {
                q: 'Posso fazer alterações ao evento pelo portal?',
                a: 'Não. O portal do cliente é de consulta. Para qualquer alteração ou pedido, deve contactar directamente a equipa Quic pelos canais habituais (email, telefone).',
              },
              {
                q: 'A informação é segura?',
                a: 'Sim. O acesso é protegido por um token criptográfico único. Apenas quem tiver o seu link pessoal consegue aceder. A plataforma utiliza HTTPS e não armazena passwords.',
              },
            ].map((item, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between py-5 text-left group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
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
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}>
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <Image src="/Design sem nome(1).png" alt="Quic" width={120} height={48} />
            <span className="text-[10px] tracking-[0.25em] uppercase text-white/30">
              Portal Exclusivo · Tempo Real
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
