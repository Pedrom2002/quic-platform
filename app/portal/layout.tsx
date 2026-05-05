import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={playfair.variable}>
      <style>{`body { background-color: #111111 !important; }`}</style>
      {children}
    </div>
  )
}
