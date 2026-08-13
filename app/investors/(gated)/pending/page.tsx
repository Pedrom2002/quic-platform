// app/investors/(gated)/pending/page.tsx
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Route } from 'next'

export default async function InvestorPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/investors/login')

  const { data: investor } = await supabase
    .from('investors')
    .select('status')
    .eq('auth_user_id', user.id)
    .single()

  if (investor?.status === 'approved') redirect('/investors/dashboard' as Route)

  const rejected = investor?.status === 'rejected'

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Image src="/logo-branco.png" alt="QUIC" width={130} height={52} className="mx-auto mb-8" />
        {rejected ? (
          <>
            <h1 className="text-xl font-semibold text-white mb-2">Pedido não aprovado</h1>
            <p className="text-zinc-400">
              O teu pedido de acesso não foi aprovado. Contacta-nos em{' '}
              <a href="mailto:investidores@quic.pt" className="text-[var(--quic-magenta)] hover:underline">
                investidores@quic.pt
              </a>{' '}
              para mais informação.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-white mb-2">A tua conta está em análise</h1>
            <p className="text-zinc-400">
              Recebemos o teu pedido de acesso. A nossa equipa vai analisá-lo e entraremos em contacto assim que for aprovado.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
