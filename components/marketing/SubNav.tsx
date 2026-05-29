'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { Send, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard/marketing/campaigns', label: 'Campanhas', icon: Send },
  { href: '/dashboard/marketing/contacts', label: 'Contactos', icon: Users },
  { href: '/dashboard/marketing/settings', label: 'Definições', icon: Settings },
]

export function MarketingSubNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1 px-8 pt-6 border-b border-zinc-200">
      {items.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              active
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
