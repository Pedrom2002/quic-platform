'use client'

import { isPast, isToday, differenceInCalendarDays, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { ItemWithMemberAndCounts } from '@/types/app'

export function KanbanCard({ item, onClick }: { item: ItemWithMemberAndCounts; onClick: () => void }) {
  const isOverdue = !!(item.due_at && item.status !== 'completed' && item.status !== 'skipped'
    && isPast(new Date(item.due_at)) && !isToday(new Date(item.due_at)))
  const daysOverdue = isOverdue && item.due_at
    ? Math.abs(differenceInCalendarDays(new Date(item.due_at), new Date()))
    : 0

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-3 mb-2 cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all"
    >
      <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">{item.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {item.assigned_member && (
          <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0">
            {item.assigned_member.full_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')}
          </span>
        )}
        {item.due_at && (
          <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
            {isOverdue ? `${daysOverdue}d atraso` : format(new Date(item.due_at), 'd MMM', { locale: pt })}
          </span>
        )}
        {item.note_count > 0 && (
          <span className="text-[10px] text-slate-400 ml-auto">{item.note_count} nota{item.note_count !== 1 ? 's' : ''}</span>
        )}
        {item.file_count > 0 && (
          <span className="text-[10px] text-slate-400">{item.file_count} fich.</span>
        )}
      </div>
    </div>
  )
}
