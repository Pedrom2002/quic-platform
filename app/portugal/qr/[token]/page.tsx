import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'

type Props = { params: Promise<{ token: string }> }

type WinnerWithReg = {
  qr_token: string
  redeemed_at: string | null
  portugal_registrations: { name: string } | null
}

export default async function QRPage({ params }: Props) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: winner } = await supabase
    .from('portugal_winners')
    .select('qr_token, redeemed_at, portugal_registrations(name)')
    .eq('qr_token', token)
    .returns<WinnerWithReg[]>()
    .maybeSingle()

  if (!winner) notFound()

  const { NEXT_PUBLIC_APP_URL: appUrl } = getEnv()
  const qrUrl = `${appUrl}/portugal/qr/${token}`
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  const name = winner.portugal_registrations?.name ?? 'Vencedor'
  const used = !!winner.redeemed_at

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
      <div className="text-4xl">🍺</div>
      <h1 className="text-xl font-bold text-gray-900">Parabens, {name}!</h1>

      {used ? (
        <div className="bg-red-50 rounded-xl p-4 space-y-2">
          <p className="text-red-700 font-semibold">Este QR ja foi utilizado.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code cerveja" className="rounded-xl" width={260} height={260} />
          </div>
          <p className="text-sm text-gray-600 font-medium">
            Mostra este ecra ao staff do bar
          </p>
        </>
      )}

      <p className="text-xs text-gray-400">
        Powered by{' '}
        <a href="https://quic.pt" className="text-red-600 hover:underline">QUiC</a>
      </p>
    </div>
  )
}
