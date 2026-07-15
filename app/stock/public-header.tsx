'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCartIcon } from 'lucide-react'

import { useCart } from '@/components/stock-cart-provider'
import { ButtonLink } from '@/components/ui/button'

export function PublicHeader() {
  const { totalItems, isReady } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <Link href="/stock" className="flex items-center gap-2">
          <Image src="/logo-preto.png" alt="Quic" width={90} height={32} priority />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/stock"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Catálogo
          </Link>
          <ButtonLink href="/stock/pedido" variant="outline" size="sm">
            <ShoppingCartIcon className="size-4" />
            <span className="hidden sm:inline">Pedido</span>
            {isReady && totalItems > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold tabular-nums text-white">
                {totalItems}
              </span>
            )}
          </ButtonLink>
        </nav>
      </div>
    </header>
  )
}
