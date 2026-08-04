import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export default function ArtistPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={playfair.variable}>
      <style>{`body { background-color: #0d0c0d !important; }`}</style>
      {children}
    </div>
  )
}
