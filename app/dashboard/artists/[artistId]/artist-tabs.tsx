'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

export function ArtistTabs({ artistId }: { artistId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/artists/${artistId}`

  const tabs = [
    { href: base, label: 'Perfil', exact: true },
    { href: `${base}/agenda`, label: 'Agenda' },
    { href: `${base}/clipping`, label: 'Clipping' },
    { href: `${base}/conteudos`, label: 'Conteúdos' },
    { href: `${base}/documentos`, label: 'Documentos' },
  ]

  return (
    <nav className="flex flex-wrap gap-1 border-b" aria-label="Secções do artista">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href as Route}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
