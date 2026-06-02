'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteReportAction } from '@/app/dashboard/events/[eventId]/reports/actions'

interface Props {
  eventId: string
  reportId: string
  blobUrl: string
}

export function DeleteReportButton({ eventId, reportId, blobUrl }: Props) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!confirm('Apagar este relatório?')) return
    startTransition(async () => {
      await deleteReportAction(eventId, reportId, blobUrl)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="Apagar relatório"
      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
