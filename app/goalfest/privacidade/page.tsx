import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacidade — Goalfest · QUiC',
  description: 'Política de privacidade e tratamento de dados RGPD para o registo no Goalfest.',
}

const SUBPROCESSORS: { name: string; role: string }[] = [
  { name: 'Supabase', role: 'base de dados · alojada na União Europeia' },
  { name: 'Vercel', role: 'alojamento da aplicação' },
]

const SECTIONS: { num: string; label: string; body: React.ReactNode }[] = [
  {
    num: '01',
    label: 'Dados recolhidos',
    body: (
      <p>
        No registo recolhemos: <strong>nome</strong>, <strong>email</strong> e{' '}
        <strong>número de telemóvel</strong>. Guardados em base de dados Supabase
        alojada na União Europeia.
      </p>
    ),
  },
  {
    num: '02',
    label: 'Finalidade',
    body: (
      <p>
        Os dados servem para te contactar com informações e comunicações sobre o
        Goalfest e futuros projetos e eventos da QUiC. Nunca vendemos nem
        partilhamos os teus dados com terceiros para fins de marketing externo.
      </p>
    ),
  },
  {
    num: '03',
    label: 'Sub-processadores',
    body: (
      <ul className="grid gap-2">
        {SUBPROCESSORS.map(s => (
          <li
            key={s.name}
            className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span className="font-bold text-gray-900">{s.name}</span>
            <span className="text-sm text-gray-500">{s.role}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: '04',
    label: 'Retenção',
    body: (
      <p>
        Os registos são mantidos por <strong>12 meses</strong> após o evento
        para divulgação de projetos futuros da QUiC, sendo depois eliminados.
        Podes pedir a eliminação a qualquer momento (ver secção 05).
      </p>
    ),
  },
  {
    num: '05',
    label: 'Direitos RGPD',
    body: (
      <p>
        Tens direito a <strong>acesso</strong>, <strong>retificação</strong>,{' '}
        <strong>eliminação</strong> e <strong>portabilidade</strong> dos teus
        dados. Para exercer, envia email para{' '}
        <a className="font-bold text-[var(--quic-magenta)] underline" href="mailto:info@quic.pt">
          info@quic.pt
        </a>{' '}
        com o email que registaste. Respondemos em até <strong>30 dias</strong>.
      </p>
    ),
  },
  {
    num: '06',
    label: 'Contacto',
    body: (
      <p>
        QUiC · Lisboa, Portugal ·{' '}
        <a className="font-bold text-[var(--quic-magenta)] underline" href="mailto:info@quic.pt">
          info@quic.pt
        </a>
      </p>
    ),
  },
]

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-20 pt-12 sm:pt-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--quic-magenta)]">
          QUiC · Goalfest
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-gray-900 sm:text-5xl">
          Privacidade
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-gray-500">
          Como tratamos os dados que partilhas connosco, em linguagem direta.
        </p>
      </header>

      <article className="mx-auto mt-10 max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-lg sm:mt-14">
        <div className="space-y-10 px-6 py-10 sm:px-10 sm:py-12">
          {SECTIONS.map(s => (
            <section key={s.num} className="grid gap-3 sm:grid-cols-[68px_1fr] sm:gap-6">
              <div className="flex sm:flex-col sm:items-end sm:text-right">
                <span className="text-3xl font-black leading-none text-[var(--quic-magenta)]">
                  {s.num}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-black leading-tight text-gray-900">
                  {s.label}
                </h2>
                <div className="mt-2 space-y-2 text-base leading-relaxed text-gray-700">
                  {s.body}
                </div>
              </div>
            </section>
          ))}
        </div>

        <hr className="mx-6 border-t border-dashed border-gray-200 sm:mx-10" />

        <footer className="px-6 py-6 text-center text-xs uppercase tracking-[0.22em] text-gray-400 sm:px-10">
          Última atualização · 06.07.2026
        </footer>
      </article>

      <div className="mx-auto mt-10 max-w-2xl text-center">
        <Link
          href="/goalfest"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--quic-black)] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#1a1a1a]"
        >
          ← Voltar ao registo
        </Link>
      </div>
    </main>
  )
}
