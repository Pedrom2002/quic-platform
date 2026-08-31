import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Golden Circle by QUIC',
  description: 'Círculo restrito de investidores em produções de eventos e concertos de alta qualidade.',
  openGraph: {
    title: 'Golden Circle by QUIC',
    description: 'Investimento qualificado em produções de entretenimento',
    type: 'website',
    url: 'https://quic.pt/golden-circle',
    siteName: 'Quic',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Golden Circle by QUIC',
    description: 'Investimento qualificado em produções de entretenimento',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://quic.pt/golden-circle',
  },
}

export default function GoldenCircleLayout({ children }: { children: React.ReactNode }) {
  return children
}
