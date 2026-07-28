'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCartIcon } from 'lucide-react'

import { useCart } from '@/components/stock-cart-provider'
import { ButtonLink } from '@/components/ui/button'

export function PublicHeader() {
  const { totalItems, isReady } = useCart()

  return (
    <header className="sticky top-0 z-40 bg-[var(--quic-black)]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <Link href="/rentals" className="flex items-center gap-2">
          <Image src="/logo-branco.png" alt="Quic" width={90} height={32} priority />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/rentals"
            className="rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-white/70 uppercase transition-colors hover:text-white"
          >
            Catálogo
          </Link>
          <ButtonLink
            href="/rentals/pedido"
            variant="outline"
            size="sm"
            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            <ShoppingCartIcon className="size-4" />
            <span className="hidden sm:inline">Pedido</span>
            {isReady && totalItems > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--quic-magenta)] px-1 text-xs font-semibold tabular-nums text-white">
                {totalItems}
              </span>
            )}
          </ButtonLink>
        </nav>
      </div>
    </header>
  )
}
