'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { ArtistAgendaItem } from '@/types/database'
import type { ArtistAgendaType } from '@/types/app'
import { agendaTypeLabels } from '@/lib/artists/format'
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

import { createAgendaItem, updateAgendaItem } from '../../content-actions'

const NO_EVENT = 'none'

// datetime-local aceita "YYYY-MM-DDTHH:MM"
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AgendaForm({
  artistId,
  item,
  events,
  notifyDefault,
  hasEmail,
  onSuccess,
}: {
  artistId: string
  item?: ArtistAgendaItem
  events: { id: string; name: string }[]
  notifyDefault?: boolean
  hasEmail?: boolean
  onSuccess?: () => void
}) {
  const [type, setType] = useState<ArtistAgendaType>((item?.type as ArtistAgendaType) ?? 'show')
  const [eventId, setEventId] = useState<string>(item?.event_id ?? NO_EVENT)
  const [isPending, startTransition] = useTransition()

  const idPrefix = item ? `agenda-${item.id}` : 'agenda-new'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = item ? await updateAgendaItem(formData) : await createAgendaItem(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(item ? 'Item atualizado' : 'Item criado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="artist_id" value={artistId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="type" value={type} />
      {eventId !== NO_EVENT && <input type="hidden" name="event_id" value={eventId} />}

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType((v as ArtistAgendaType) ?? type)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(agendaTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-48 flex-[2] flex-col gap-2">
          <Label htmlFor={`${idPrefix}-title`}>Título</Label>
          <Input
            id={`${idPrefix}-title`}
            name="title"
            placeholder="Ex.: Concerto no Coliseu"
            defaultValue={item?.title ?? ''}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-44 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-starts`}>Início</Label>
          <Input
            id={`${idPrefix}-starts`}
            name="starts_at"
            type="datetime-local"
            defaultValue={toLocalInput(item?.starts_at ?? null)}
          />
        </div>
        <div className="flex min-w-44 flex-1 flex-col gap-2">
          <Label htmlFor={`${idPrefix}-ends`}>Fim (opcional)</Label>
          <Input
            id={`${idPrefix}-ends`}
            name="ends_at"
            type="datetime-local"
            defaultValue={toLocalInput(item?.ends_at ?? null)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-location`}>Local</Label>
        <Input
          id={`${idPrefix}-location`}
          name="location"
          placeholder="Opcional"
          defaultValue={item?.location ?? ''}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Evento associado</Label>
        <Select value={eventId} onValueChange={(v) => setEventId(v ?? NO_EVENT)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_EVENT}>Nenhum</SelectItem>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notas</Label>
        <Textarea id={`${idPrefix}-notes`} name="notes" rows={2} defaultValue={item?.notes ?? ''} />
      </div>

      <label className="flex items-center gap-2 text-sm" htmlFor={`${idPrefix}-visible`}>
        <input
          id={`${idPrefix}-visible`}
          type="checkbox"
          name="is_visible"
          value="on"
          defaultChecked={item?.is_visible ?? true}
          className="h-4 w-4 accent-primary"
        />
        Visível no portal do artista
      </label>

      {!item && (
        <label className="flex items-center gap-2 text-sm" htmlFor={`${idPrefix}-notify`}>
          <input
            id={`${idPrefix}-notify`}
            type="checkbox"
            name="notify"
            defaultChecked={notifyDefault}
            disabled={!hasEmail}
            className="h-4 w-4 accent-primary"
          />
          Notificar o artista por email
          {!hasEmail && <span className="text-muted-foreground">(sem email definido)</span>}
        </label>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : item ? 'Guardar' : 'Adicionar à agenda'}
      </Button>
    </form>
  )
}
