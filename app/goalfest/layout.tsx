import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Goalfest — QUiC',
  description: 'Regista-te no Goalfest!',
}

export default function GoalfestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors theme="light" />
    </>
  )
}
