import { CartProvider } from '@/components/stock-cart-provider'
import { Toaster } from '@/components/ui/sonner'

import { PublicHeader } from './public-header'

export default function StockLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
            <p className="font-medium text-foreground">Quic</p>
            <p>Som, luz, palco, vídeo e decoração para eventos.</p>
          </div>
        </footer>
      </div>
      <Toaster />
    </CartProvider>
  )
}
