'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { Investor, InvestmentProject } from '@/types/database'
import { DOCUMENT_TYPES } from '@/lib/golden-circle/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { createDocument } from './actions'

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  report: 'Relatório',
  tax: 'Fiscal',
  presentation: 'Apresentação',
}

type Target = { kind: 'investor'; id: string } | { kind: 'project'; id: string } | null

export function DocumentForm({
  investors,
  projects,
  onSuccess,
}: {
  investors: Pick<Investor, 'id' | 'full_name'>[]
  projects: Pick<InvestmentProject, 'id' | 'name'>[]
  onSuccess?: () => void
}) {
  const [type, setType] = useState('')
  const [target, setTarget] = useState<Target>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    if (target?.kind === 'investor') formData.set('investor_id', target.id)
    if (target?.kind === 'project') formData.set('project_id', target.id)

    startTransition(async () => {
      const result = await createDocument(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Documento adicionado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-title">Título</Label>
        <Input id="doc-title" name="title" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo de documento" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Associar a</Label>
        <Select
          value={target ? `${target.kind}:${target.id}` : undefined}
          onValueChange={(v) => {
            if (!v) { setTarget(null); return }
            const [kind, id] = v.split(':')
            setTarget({ kind: kind as 'investor' | 'project', id })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolhe um investidor ou projeto" />
          </SelectTrigger>
          <SelectContent>
            {investors.map((investor) => (
              <SelectItem key={`investor:${investor.id}`} value={`investor:${investor.id}`}>
                Investidor: {investor.full_name}
              </SelectItem>
            ))}
            {projects.map((project) => (
              <SelectItem key={`project:${project.id}`} value={`project:${project.id}`}>
                Projeto: {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-file">Ficheiro</Label>
        <Input id="doc-file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A enviar...' : 'Adicionar documento'}
      </Button>
    </form>
  )
}
