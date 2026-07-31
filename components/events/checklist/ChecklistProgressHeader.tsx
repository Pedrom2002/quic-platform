'use client'

interface ChecklistProgressHeaderProps {
  completed: number
  total: number
  percent: number
}

export function ChecklistProgressHeader({ completed, total, percent }: ChecklistProgressHeaderProps) {
  return (
    <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">Progresso</span>
        <span className="text-sm font-semibold text-slate-800">{completed}/{total} etapas · {percent}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
