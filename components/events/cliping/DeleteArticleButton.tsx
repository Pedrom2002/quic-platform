'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteArticleAction } from '@/app/dashboard/events/[eventId]/cliping/actions'

interface Props {
  eventId: string
  articleId: string
}

export function DeleteArticleButton({ eventId, articleId }: Props) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!confirm('Apagar este artigo?')) return
    startTransition(async () => {
      await deleteArticleAction(eventId, articleId)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="Apagar artigo"
      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
