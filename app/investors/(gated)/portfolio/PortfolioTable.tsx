'use client'

import { useState } from 'react'

export type PortfolioRow = {
  id: string
  projectName: string
  phaseLabel: string
  phaseClasses: string
  amountCents: number
  returnPercentage: number | null
  nextMilestone: string
  investmentStatus: 'active' | 'returned' | 'written_off' | string
}

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

type FilterKey = 'all' | 'active' | 'completed'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'completed', label: 'Concluídos' },
]

function matchesFilter(row: PortfolioRow, filter: FilterKey): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return row.investmentStatus === 'active'
  return row.investmentStatus === 'returned' || row.investmentStatus === 'written_off'
}

export function PortfolioTable({ investments }: { investments: PortfolioRow[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const filtered = investments.filter(row => matchesFilter(row, filter))

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-base font-semibold text-zinc-900">Os seus projetos</h2>
        <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                filter === f.key
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-zinc-500">Sem projetos para este filtro.</p>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[42rem]">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Projeto</th>
                <th className="text-left px-4 py-3 font-medium">Fase</th>
                <th className="text-left px-4 py-3 font-medium">Capital</th>
                <th className="text-left px-4 py-3 font-medium">Retorno estimado</th>
                <th className="text-left px-4 py-3 font-medium">Próximo marco</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-900 font-medium">{row.projectName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${row.phaseClasses}`}>
                      {row.phaseLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{formatCents(row.amountCents)}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.returnPercentage != null ? `+${row.returnPercentage.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{row.nextMilestone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
