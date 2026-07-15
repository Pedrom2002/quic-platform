'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { StockEvent, StockEventStatus } from '@/lib/stock/types'
import { eventStatusLabels } from '@/lib/stock/format'
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
import { Textarea } from '@/components/ui/textarea'

import { createEvent, updateEvent } from './actions'

const statusOptions = Object.entries(eventStatusLabels) as [
  StockEventStatus,
  string,
][]

export function EventForm({
  event,
  onSuccess,
}: {
  event?: StockEvent
  onSuccess?: () => void
}) {
  const [status, setStatus] = useState<StockEventStatus>(
    event?.status ?? 'planeado'
  )
  const [isPending, startTransition] = useTransition()

  const idPrefix = event ? `event-${event.id}` : 'event-new'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = event
        ? await updateEvent(formData)
        : await createEvent(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(event ? 'Evento atualizado' : 'Evento criado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {event && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="status" value={status} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Nome</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          placeholder="Ex.: Casamento Silva"
          defaultValue={event?.name ?? ''}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-client`}>Cliente</Label>
        <Input
          id={`${idPrefix}-client`}
          name="client_name"
          placeholder="Nome do cliente (opcional)"
          defaultValue={event?.client_name ?? ''}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-starts`}>Início</Label>
          <Input
            id={`${idPrefix}-starts`}
            name="starts_on"
            type="date"
            defaultValue={event?.starts_on ?? ''}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-ends`}>Fim</Label>
          <Input
            id={`${idPrefix}-ends`}
            name="ends_on"
            type="date"
            defaultValue={event?.ends_on ?? ''}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label>Estado</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus((value as StockEventStatus | null) ?? status)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notas</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={3}
          defaultValue={event?.notes ?? ''}
        />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : event ? 'Guardar' : 'Criar evento'}
      </Button>
    </form>
  )
}
