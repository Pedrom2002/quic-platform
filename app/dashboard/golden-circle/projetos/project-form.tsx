'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { InvestmentProject } from '@/types/database'
import { PROJECT_STATUSES } from '@/lib/golden-circle/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { createProject, updateProject } from './actions'

const STATUS_LABELS: Record<string, string> = {
  coming_soon: 'Brevemente',
  open: 'Em venda',
  closed: 'Fechado',
  completed: 'Concluído',
}

function centsToEuros(cents: number | null): string {
  if (cents == null) return ''
  return String(cents / 100)
}

export function ProjectForm({
  project,
  onSuccess,
}: {
  project?: InvestmentProject
  onSuccess?: () => void
}) {
  const [status, setStatus] = useState(project?.status ?? 'coming_soon')
  const [isPending, startTransition] = useTransition()
  const idPrefix = project ? `project-${project.id}` : 'project-new'

  function handleSubmit(formData: FormData) {
    const euros = formData.get('funding_goal_euros')
    formData.set('funding_goal_cents', String(Math.round(Number(euros) * 100)))

    const revenueEuros = formData.get('actual_revenue_euros')
    if (revenueEuros) {
      formData.set('actual_revenue_cents', String(Math.round(Number(revenueEuros) * 100)))
    }

    startTransition(async () => {
      const result = project ? await updateProject(formData) : await createProject(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(project ? 'Projeto atualizado' : 'Projeto criado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {project && <input type="hidden" name="id" value={project.id} />}
      <input type="hidden" name="status" value={status} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Nome</Label>
        <Input id={`${idPrefix}-name`} name="name" defaultValue={project?.name ?? ''} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-description`}>Descrição</Label>
        <Textarea id={`${idPrefix}-description`} name="description" rows={3} defaultValue={project?.description ?? ''} />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label>Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus((v as typeof status) ?? status)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-goal`}>Meta (€)</Label>
          <Input
            id={`${idPrefix}-goal`}
            name="funding_goal_euros"
            type="number"
            step="0.01"
            min="0"
            defaultValue={centsToEuros(project?.funding_goal_cents ?? null)}
          />
        </div>
        <div className="flex min-w-32 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-capacity`}>Capacidade</Label>
          <Input
            id={`${idPrefix}-capacity`}
            name="capacity"
            type="number"
            min="0"
            defaultValue={project?.capacity ?? ''}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-deadline`}>Prazo</Label>
          <Input
            id={`${idPrefix}-deadline`}
            name="investment_deadline"
            type="date"
            defaultValue={project?.investment_deadline ?? ''}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-revenue`}>Receita real (€)</Label>
          <Input
            id={`${idPrefix}-revenue`}
            name="actual_revenue_euros"
            type="number"
            step="0.01"
            min="0"
            defaultValue={centsToEuros(project?.actual_revenue_cents ?? null)}
          />
        </div>
        <div className="flex min-w-32 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-attendance`}>Assistência</Label>
          <Input
            id={`${idPrefix}-attendance`}
            name="attendance"
            type="number"
            min="0"
            defaultValue={project?.attendance ?? ''}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : project ? 'Guardar' : 'Criar projeto'}
      </Button>
    </form>
  )
}
