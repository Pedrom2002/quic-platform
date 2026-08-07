// app/tickets/layout.tsx
import Link from 'next/link'

export default function TicketsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/tickets" className="text-white text-sm font-semibold">
            Quic Bilhetes
          </Link>
          <Link href="/tickets/meus-bilhetes" className="text-zinc-300 text-sm underline hover:text-white">
            Os Meus Bilhetes
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
