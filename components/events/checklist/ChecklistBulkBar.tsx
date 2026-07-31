'use client'

import { CheckCircle2, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChecklistBulkBarProps {
  selectedCount: number
  bulkLoading: boolean
  onBulkUpdate: (status: 'completed' | 'in_progress' | 'skipped') => void
  onClearSelection: () => void
}

export function ChecklistBulkBar({ selectedCount, bulkLoading, onBulkUpdate, onClearSelection }: ChecklistBulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky top-2 z-10 flex items-center gap-2 mb-3 p-3 bg-slate-900 text-white rounded-xl shadow-lg">
      <span className="text-sm font-medium flex-1">
        {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
      </span>
      <Button size="sm" disabled={bulkLoading}
        className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white border-0"
        onClick={() => onBulkUpdate('completed')}>
        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Concluído
      </Button>
      <Button size="sm" disabled={bulkLoading}
        className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0"
        onClick={() => onBulkUpdate('in_progress')}>
        Em Progresso
      </Button>
      <Button size="sm" disabled={bulkLoading}
        className="h-7 px-3 text-xs bg-slate-600 hover:bg-slate-500 text-white border-0"
        onClick={() => onBulkUpdate('skipped')}>
        <SkipForward className="w-3.5 h-3.5 mr-1" />Saltar
      </Button>
      <Button size="sm" variant="ghost" disabled={bulkLoading}
        className="h-7 px-2 text-white/60 hover:text-white hover:bg-slate-700"
        onClick={onClearSelection}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
