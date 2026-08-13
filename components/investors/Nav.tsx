// components/investors/Nav.tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/investors/dashboard', active: true },
  { label: 'Opportunities', href: '#', active: false },
  { label: 'Coming Soon', href: '#', active: false },
  { label: 'Track Record', href: '#', active: false },
  { label: 'Portfolio', href: '#', active: false },
  { label: 'Documents', href: '#', active: false },
  { label: 'Insights', href: '#', active: false },
  { label: 'Profile / KYC', href: '#', active: false },
]

export function Nav({ userName }: { userName: string }) {
  return (
    <nav className="w-64 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col p-4">
      <div className="mb-8">
        <Image src="/logo-branco.png" alt="QUIC" width={110} height={44} />
      </div>
      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => (
          <li key={item.label}>
            {item.active ? (
              <Link
                href={item.href as Route}
                className="block px-3 py-2 rounded-md text-sm font-medium bg-[var(--quic-magenta)] text-white"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="block px-3 py-2 rounded-md text-sm font-medium text-zinc-500 cursor-not-allowed flex items-center justify-between"
                aria-disabled="true"
              >
                {item.label}
                <span className="text-[10px] uppercase border border-zinc-700 rounded px-1.5 py-0.5">Em breve</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="border-t border-zinc-800 pt-4 text-sm text-zinc-400">
        {userName}
      </div>
    </nav>
  )
}
