'use client'

import { useState, useEffect, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateEventSchema, type UpdateEventInput } from '@/schemas/event.schema'
import { createClient } from '@/lib/supabase/client'
import { updateEventAction, updateEventCoverPhoto } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { PortalVideoSettings } from '@/components/events/PortalVideoSettings'

const STATUS_PT: Record<string, string> = {
  planning: 'Em Planeamento',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export default function EditEventPage() {
  const params = useParams<{ eventId: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [isPublicListed, setIsPublicListed] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UpdateEventInput>({
    resolver: zodResolver(updateEventSchema),
  })

  const [isPendingPhoto, startPhotoTransition] = useTransition()

  function handlePhotoSubmit(formData: FormData) {
    setUploadingPhoto(true)
    startPhotoTransition(async () => {
      const result = await updateEventCoverPhoto(formData)
      setUploadingPhoto(false)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Capa atualizada')
      router.refresh()
    })
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('events').select('*').eq('id', params.eventId).single().then(({ data }) => {
      if (data) {
        reset({
          name: data.name,
          description: data.description ?? '',
          venue_name: data.venue_name ?? '',
          venue_address: data.venue_address ?? '',
          status: data.status as 'active' | 'completed' | 'planning' | 'cancelled',
          start_datetime: format(new Date(data.start_datetime), "yyyy-MM-dd'T'HH:mm"),
          end_datetime: format(new Date(data.end_datetime), "yyyy-MM-dd'T'HH:mm"),
        })
        setCoverUrl(data.cover_image_url ?? null)
        setIsPublicListed(data.is_public_listed ?? false)
      }
      setFetching(false)
    })
  }, [params.eventId])

  async function onSubmit(data: UpdateEventInput) {
    setLoading(true)
    try {
      await updateEventAction(params.eventId, data)
      toast.success('Evento atualizado')
      router.push(`/dashboard/events/${params.eventId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar evento')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-slate-400">A carregar...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link href={`/dashboard/events/${params.eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Voltar ao evento
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Editar Evento</h1>
      </div>

      <PortalVideoSettings eventId={params.eventId} />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-5">Detalhes do evento</h2>

        <div className="mb-6 space-y-1.5">
          <Label className="text-slate-600">Foto de capa (app mobile)</Label>
          <div className="flex flex-wrap items-center gap-4">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="Capa do evento" className="h-20 w-32 rounded-lg object-cover" />
            ) : (
              <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                Sem foto
              </div>
            )}
            <form
              action={(formData: FormData) => {
                formData.set('id', params.eventId)
                handlePhotoSubmit(formData)
              }}
              className="flex flex-1 flex-wrap items-center gap-2"
            >
              <Input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif" className="max-w-64 bg-white border-slate-200" />
              <Button type="submit" disabled={isPendingPhoto} variant="secondary">
                {isPendingPhoto ? 'A enviar...' : 'Guardar capa'}
              </Button>
            </form>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-slate-600">Nome *</Label>
            <Input {...register('name')} className="bg-white border-slate-200" />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600">Estado</Label>
            <Select
              value={watch('status')}
              onValueChange={val => val && setValue('status', val as UpdateEventInput['status'], { shouldValidate: true })}
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue>{STATUS_PT[watch('status') ?? ''] ?? ''}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Em Planeamento</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-600">Início *</Label>
              <DateTimePicker
                value={watch('start_datetime')}
                onChange={val => {
                  setValue('start_datetime', val, { shouldValidate: true })
                  const end = watch('end_datetime')
                  if (end && new Date(end) <= new Date(val)) {
                    const adjusted = new Date(new Date(val).getTime() + 60 * 60 * 1000)
                    const pad = (n: number) => String(n).padStart(2, '0')
                    const adjustedStr = `${adjusted.getFullYear()}-${pad(adjusted.getMonth() + 1)}-${pad(adjusted.getDate())}T${pad(adjusted.getHours())}:${pad(adjusted.getMinutes())}`
                    setValue('end_datetime', adjustedStr, { shouldValidate: true })
                  }
                }}
                placeholder="Selecionar data e hora"
              />
              {errors.start_datetime && <p className="text-red-500 text-xs">{errors.start_datetime.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-600">Fim *</Label>
              <DateTimePicker
                value={watch('end_datetime')}
                onChange={val => setValue('end_datetime', val, { shouldValidate: true })}
                placeholder="Selecionar data e hora"
                minValue={watch('start_datetime')}
              />
              {errors.end_datetime && <p className="text-red-500 text-xs">{errors.end_datetime.message as string}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600">Local</Label>
            <Input {...register('venue_name')} className="bg-white border-slate-200" placeholder="ex: Altice Arena" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600">Morada</Label>
            <Input {...register('venue_address')} className="bg-white border-slate-200" placeholder="ex: Rossio dos Olivais, Lisboa" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600">Descrição</Label>
            <Textarea {...register('description')} rows={3} className="bg-white border-slate-200 resize-none" />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public_listed"
              checked={isPublicListed}
              onChange={e => {
                setIsPublicListed(e.target.checked)
                setValue('is_public_listed', e.target.checked, { shouldValidate: true })
              }}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="is_public_listed" className="text-slate-600 cursor-pointer">
              Publicar no app mobile
            </Label>
          </div>
          <p className="text-xs text-slate-400 -mt-3">
            Só eventos publicados aparecem no feed público da app.
          </p>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'A guardar...' : 'Guardar alterações'}
            </Button>
            <ButtonLink href={`/dashboard/events/${params.eventId}`} variant="outline">Cancelar</ButtonLink>
          </div>
        </form>
      </div>
    </div>
  )
}
