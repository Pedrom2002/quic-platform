'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEventSchema, type CreateEventInput } from '@/schemas/event.schema'
import { createEventAction, saveChecklistDraftsAction, type ChecklistItemDraft } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Globe, Eye, EyeOff, Trash2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { EventType } from '@/types/database'
import type { NotificationRule } from '@/types/app'
import type { EventChecklistItem } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  eventTypes: EventType[]
}

export function NewEventClient({ eventTypes }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [eventId, setEventId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<ChecklistItemDraft[]>([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
  })

  async function onSubmitStep1(data: CreateEventInput) {
    setLoading(true)
    try {
      const normaliseDate = (s: string) => new Date(s).toISOString()
      data = { ...data, start_datetime: normaliseDate(data.start_datetime), end_datetime: normaliseDate(data.end_datetime) }
      const { eventId: id, items } = await createEventAction(data)
      setEventId(id)
      setDrafts(items.map((item: EventChecklistItem) => {
        const rules = (item.notification_rules as unknown as NotificationRule[]) ?? []
        const channels: string[] = rules[0]?.channels ?? []
        return {
          id: item.id,
          title: item.title,
          client_label: item.client_label ?? item.title,
          is_client_visible: item.is_client_visible ?? true,
          notify_email: channels.includes('email'),
          notify_portal: channels.includes('portal'),
        }
      }))
      setStep(2)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar evento')
    } finally {
      setLoading(false)
    }
  }

  function updateDraft(id: string, patch: Partial<ChecklistItemDraft>) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  function removeDraft(id: string) {
    setDrafts(prev => prev.filter(d => d.id !== id))
  }

  async function finishWizard() {
    if (!eventId) return
    setSaving(true)
    try {
      await saveChecklistDraftsAction(eventId, drafts)
      toast.success('Evento criado com sucesso!')
      router.push(`/dashboard/events/${eventId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao guardar etapas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/events" className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Voltar aos eventos
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Novo Evento</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={cn('px-2 py-0.5 rounded-full font-medium', step === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>1 Detalhes</span>
            <ChevronRight className="w-3 h-3" />
            <span className={cn('px-2 py-0.5 rounded-full font-medium', step === 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>2 Etapas</span>
          </div>
        </div>
        <p className="text-slate-500 mt-1">
          {step === 1 ? 'Preenche as informações base do evento.' : 'Personaliza as etapas e define quais notificam o cliente.'}
        </p>
      </div>

      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-5">Detalhes do Evento</h2>
          <form onSubmit={handleSubmit(onSubmitStep1)} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-slate-600">Nome do Evento *</Label>
              <Input {...register('name')} placeholder="ex: Concerto João Silva — Lisboa 2026"
                className="bg-white border-slate-200" />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-600">Tipo de Evento *</Label>
              <Select onValueChange={val => val && setValue('event_type_id', val as string, { shouldValidate: true })}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Selecionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(et => (
                    <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.event_type_id && <p className="text-red-500 text-xs">{errors.event_type_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-600">Início *</Label>
                <DateTimePicker value={watch('start_datetime')}
                  onChange={val => setValue('start_datetime', val, { shouldValidate: true })}
                  placeholder="Selecionar data e hora" />
                {errors.start_datetime && <p className="text-red-500 text-xs">{errors.start_datetime.message as string}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-600">Fim *</Label>
                <DateTimePicker value={watch('end_datetime')}
                  onChange={val => setValue('end_datetime', val, { shouldValidate: true })}
                  placeholder="Selecionar data e hora" />
                {errors.end_datetime && <p className="text-red-500 text-xs">{errors.end_datetime.message as string}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-600">Local</Label>
              <Input {...register('venue_name')} placeholder="ex: Altice Arena"
                className="bg-white border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-600">Morada</Label>
              <Input {...register('venue_address')} placeholder="ex: Rossio dos Olivais, Lisboa"
                className="bg-white border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-600">Descrição</Label>
              <Textarea {...register('description')} placeholder="Notas internas sobre o evento..."
                rows={3} className="bg-white border-slate-200 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'A criar...' : 'Seguinte — Configurar Etapas'}
              </Button>
              <ButtonLink href="/dashboard/events" variant="outline">Cancelar</ButtonLink>
            </div>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Etapas do Checklist</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define o título visível pelo cliente, se a etapa é visível no portal, e quais os canais de notificação ao marcar como concluída.
              </p>
            </div>
            <div className="p-4 space-y-2">
              {drafts.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">Nenhuma etapa. Adiciona uma abaixo.</p>
              )}
              {drafts.map((d, i) => (
                <div key={d.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-300 text-xs mt-2.5 w-5 shrink-0 text-right">{i + 1}</span>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={d.title}
                        onChange={e => updateDraft(d.id, { title: e.target.value })}
                        placeholder="Título interno"
                        className="bg-white border-slate-200 text-sm h-8"
                      />
                      <Input
                        value={d.client_label ?? ''}
                        onChange={e => updateDraft(d.id, { client_label: e.target.value })}
                        placeholder="Label visível pelo cliente (ex: Palco montado)"
                        className="bg-white border-slate-200 text-xs h-7"
                      />
                    </div>
                    <button type="button" onClick={() => removeDraft(d.id)}
                      className="text-slate-300 hover:text-red-500 mt-2 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pl-7">
                    <button type="button"
                      onClick={() => updateDraft(d.id, { is_client_visible: !d.is_client_visible })}
                      className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
                        d.is_client_visible
                          ? 'border-slate-300 bg-white text-slate-700'
                          : 'border-slate-200 bg-slate-100 text-slate-400'
                      )}>
                      {d.is_client_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      Visível cliente
                    </button>
                    <button type="button"
                      onClick={() => updateDraft(d.id, { notify_email: !d.notify_email })}
                      className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
                        d.notify_email
                          ? 'border-blue-200 bg-blue-50 text-blue-600'
                          : 'border-slate-200 bg-white text-slate-400'
                      )}>
                      <Mail className="w-3 h-3" />Email
                    </button>
                    <button type="button"
                      onClick={() => updateDraft(d.id, { notify_portal: !d.notify_portal })}
                      className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
                        d.notify_portal
                          ? 'border-violet-200 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-white text-slate-400'
                      )}>
                      <Globe className="w-3 h-3" />Portal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={finishWizard} disabled={saving} className="flex-1">
              {saving ? 'A guardar...' : 'Concluir e abrir evento'}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/events/${eventId}`)}>
              Saltar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
