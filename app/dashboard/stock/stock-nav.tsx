'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const stockNavItems = [
  { href: '/dashboard/stock', label: 'Dashboard', exact: true },
  { href: '/dashboard/stock/materiais', label: 'Materiais' },
  { href: '/dashboard/stock/categorias', label: 'Categorias' },
  { href: '/dashboard/stock/eventos', label: 'Eventos' },
  { href: '/dashboard/stock/movimentos', label: 'Movimentos' },
  { href: '/dashboard/stock/pedidos', label: 'Pedidos' },
]

export function StockNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b pb-px">
      {stockNavItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={cn(
              'shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
              isActive
                ? 'border-foreground font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
