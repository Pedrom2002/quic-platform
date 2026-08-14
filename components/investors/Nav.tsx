// components/investors/Nav.tsx
'use client'

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
  { label: 'Insights', href: '#', enabled: false },
  { label: 'Profile / KYC', href: '/investors/profile', enabled: true },
]

export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <nav className="w-64 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col p-4">
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
    </nav>
  )
}
