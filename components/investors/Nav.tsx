// components/investors/Nav.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Route } from 'next'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/investors/dashboard', enabled: true },
  { label: 'Opportunities', href: '/investors/opportunities', enabled: true },
  { label: 'Track Record', href: '/investors/track-record', enabled: true },
  { label: 'Portfolio', href: '/investors/portfolio', enabled: true },
  { label: 'Documents', href: '/investors/documents', enabled: true },
  { label: 'Insights', href: '/investors/insights', enabled: true },
  { label: 'Profile / KYC', href: '/investors/profile', enabled: true },
]

function NavLinks({ userName, onNavigate }: { userName: string; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <div className="mb-8">
        <Image src="/logo-branco.png" alt="QUIC" width={110} height={44} />
      </div>
      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => {
          const current = item.enabled && pathname.startsWith(item.href)
          return (
            <li key={item.label}>
              {item.enabled ? (
                <Link
                  href={item.href as Route}
                  onClick={onNavigate}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    current ? 'bg-[var(--quic-magenta)] text-white' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-zinc-500 cursor-not-allowed">
                  {item.label}
                  <span className="text-[10px] uppercase border border-zinc-700 rounded px-1.5 py-0.5">Em breve</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="border-t border-zinc-800 pt-4 text-sm text-zinc-400">
        {userName}
      </div>
    </>
  )
}

export function Nav({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Barra superior só em mobile, com botão de abrir o menu */}
      <div className="md:hidden flex items-center justify-between bg-zinc-950 border-b border-zinc-800 px-4 py-3">
        <Image src="/logo-branco.png" alt="QUIC" width={90} height={36} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="text-zinc-300 p-2 -mr-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Nav fixa em desktop */}
      <nav className="hidden md:flex w-64 shrink-0 bg-zinc-950 border-r border-zinc-800 flex-col p-4">
        <NavLinks userName={userName} />
      </nav>

      {/* Drawer em mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col p-4 overflow-y-auto">
            <NavLinks userName={userName} onNavigate={() => setOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/50"
          />
        </div>
      )}
    </>
  )
}
