import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { ensureStockProfile } from './profile-actions'
import { StockNav } from './stock-nav'

export default async function StockLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Regista/atualiza o perfil do utilizador (autor dos movimentos). Nunca
  // deve bloquear o acesso se falhar.
  try {
    await ensureStockProfile()
  } catch {
    // Falha do perfil é ignorada: é apenas para resolver o autor no ledger.
  }

  return (
    <div className="flex flex-col gap-6">
      <StockNav />
      {children}
    </div>
  )
}
