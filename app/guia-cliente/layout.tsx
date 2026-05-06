import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata = {
  title: 'Guia do Cliente — Quic',
  description: 'Tudo o que precisa saber sobre o acompanhamento do seu evento na plataforma Quic.',
}

export default function GuiaClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={playfair.variable}>
      {children}
    </div>
  )
}
