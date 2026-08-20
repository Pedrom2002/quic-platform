'use client'

import dynamic from 'next/dynamic'
import type { DashboardDistributionEntry } from './actions'

// recharts é uma dependência pesada e estes gráficos ficam abaixo da dobra
// do dashboard; carregar via next/dynamic (ssr: false) tira-os do bundle
// inicial da página, sem mudar a API consumida por page.tsx.
export const EvolutionChart = dynamic(
  () => import('./charts-inner').then(mod => mod.EvolutionChart),
  { ssr: false, loading: () => <div className="h-56 w-full animate-pulse rounded-lg bg-zinc-100" /> }
) as (props: { data: { month: string; valueCents: number }[] }) => React.JSX.Element

export const DistributionChart = dynamic(
  () => import('./charts-inner').then(mod => mod.DistributionChart),
  { ssr: false, loading: () => <div className="h-52 w-full animate-pulse rounded-lg bg-zinc-100" /> }
) as (props: { distribution: DashboardDistributionEntry[]; totalLabel: string }) => React.JSX.Element
