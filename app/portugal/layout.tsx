import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Jogo de Portugal — QUiC',
  description: 'Regista-te e concorre a uma cerveja durante o jogo de Portugal!',
}

export default function PortugalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-red-700 flex flex-col items-center justify-center p-4">
      {children}
      <Toaster richColors theme="light" />
    </div>
  )
}
