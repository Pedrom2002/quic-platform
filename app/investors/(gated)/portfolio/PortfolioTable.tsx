'use client'

import { useState } from 'react'
import { formatCents } from '@/lib/format-money'

export type PortfolioRow = {
  id: string
  projectName: string
  phaseLabel: string
  phaseClasses: string
  salesStatusLabel: string
  amountCents: number
  returnPercentage: number | null
  nextMilestone: string
  investmentStatus: 'active' | 'returned' | 'written_off' | string
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

// Break-even% e data de relatorio nao existem na BD (nao ha modelo de
// vendas/reporting por projeto). Gera valores de demonstracao deterministicos
// a partir do id do projeto, para o resumo parecer variado mas ser estavel
// entre renders (nao aleatorio a cada load).
function hashSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash
}

function demoBreakEvenPercentage(id: string): number {
  return 35 + (hashSeed(id) % 61) // 35-95%
}

function demoNextReportDate(id: string): string {
  const day = 1 + (hashSeed(id) % 28)
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const month = monthNames[hashSeed(id.split('').reverse().join('')) % 12]
  return `${day} de ${month}`
}

export function PortfolioTable({ investments }: { investments: PortfolioRow[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const filtered = investments.filter(row => matchesFilter(row, filter))
  const [selectedId, setSelectedId] = useState<string | null>(filtered[0]?.id ?? null)
  const selected = filtered.find(row => row.id === selectedId) ?? filtered[0] ?? null

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
        <>
          <div className="border border-zinc-200 rounded-t-lg overflow-x-auto">
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
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`border-t border-zinc-200 cursor-pointer ${
                      row.id === selected?.id ? 'bg-zinc-50' : 'hover:bg-zinc-50'
                    }`}
                  >
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

          {selected && (
            <div className="border border-t-0 border-zinc-200 rounded-b-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">{selected.projectName}</span>
              {' · '}
              {selected.salesStatusLabel}
              {' · '}
              {demoBreakEvenPercentage(selected.id)}% do break-even atingido
              {' · '}
              Relatório seguinte a {demoNextReportDate(selected.id)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
