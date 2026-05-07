export const EVENT_STATUS_LABEL: Record<string, string> = {
  planning: 'Em Planeamento',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export const EVENT_STATUS_COLOR: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-600 border border-slate-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed: 'bg-slate-100 text-slate-400 border border-slate-200',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
}

export function calcProgress(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}
