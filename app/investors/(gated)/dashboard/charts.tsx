'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts'
import type { DashboardDistributionEntry } from './actions'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

const DONUT_COLORS = ['#eab308', '#22c55e', '#f97316', '#0ea5e9', '#a855f7', '#ec4899']

export function EvolutionChart({ data }: { data: { month: string; valueCents: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="evolutionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => formatCents(v)}
            width={70}
          />
          <Tooltip formatter={(v) => formatCents(Number(v) || 0)} labelStyle={{ color: '#18181b' }} />
          <Area
            type="monotone"
            dataKey="valueCents"
            stroke="#eab308"
            strokeWidth={2}
            fill="url(#evolutionFill)"
            dot={{ r: 3, stroke: '#eab308', fill: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DistributionChart({
  distribution,
  totalLabel,
}: {
  distribution: DashboardDistributionEntry[]
  totalLabel: string
}) {
  return (
    <div>
      <div className="relative h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={distribution}
              dataKey="amountCents"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {distribution.map((entry, i) => (
                <Cell key={entry.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatCents(Number(v) || 0)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-semibold text-zinc-900">{totalLabel}</span>
          <span className="text-xs text-zinc-500">total</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {distribution.map((entry, i) => (
          <li key={entry.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-700 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
              />
              <span className="truncate">{entry.name}</span>
            </span>
            <span className="text-zinc-900 font-medium shrink-0 ml-2">{entry.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
