import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--quic-black)] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="text-6xl">⚽</div>
        <h1 className="text-2xl font-bold text-gray-900">Registado!</h1>
        <p className="text-gray-600">
          Obrigado! Vamos manter-te a par de tudo o que se passa no Goalfest.
        </p>
        <p className="text-sm text-gray-400">
          Powered by{' '}
          <Link href="https://quic.pt" className="text-[var(--quic-magenta)] font-medium hover:underline">
            QUiC
          </Link>
        </p>
      </div>
    </div>
  )
}
