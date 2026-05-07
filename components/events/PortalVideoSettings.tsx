'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePortalVideosAction } from '@/app/dashboard/events/[eventId]/edit/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Video } from 'lucide-react'

const FALLBACK_HERO = 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/144156-784280927.mp4'
const FALLBACK_CONTENT = 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/45961-447087612.mp4'

function VideoPreview({ url, fallback, label }: { url: string; fallback: string; label: string }) {
  const src = url || fallback
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-600">{label}</Label>
      <Input
        value={url}
        readOnly
        placeholder={fallback}
        className="bg-slate-50 border-slate-200 text-xs font-mono text-slate-400"
      />
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-900 mt-2">
        <video
          key={src}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-80"
        />
        {!url && (
          <div className="absolute bottom-2 left-2 text-[10px] text-white/50 tracking-widest uppercase">
            predefinido
          </div>
        )}
      </div>
    </div>
  )
}

function VideoField({
  label,
  value,
  onChange,
  fallback,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  fallback: string
}) {
  const [preview, setPreview] = useState(value || fallback)
  const [inputVal, setInputVal] = useState(value)

  useEffect(() => {
    setInputVal(value)
    setPreview(value || fallback)
  }, [value, fallback])

  function handleBlur() {
    setPreview(inputVal || fallback)
    onChange(inputVal)
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-slate-600">{label}</Label>
      <Input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onBlur={handleBlur}
        placeholder={fallback}
        className="bg-white border-slate-200 text-xs font-mono"
      />
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-900 mt-2">
        <video
          key={preview}
          src={preview}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-80"
        />
        {!inputVal && (
          <div className="absolute bottom-2 left-2 text-[10px] text-white/50 tracking-widest uppercase">
            predefinido
          </div>
        )}
      </div>
    </div>
  )
}

export function PortalVideoSettings({ eventId }: { eventId: string }) {
  const [heroVideo, setHeroVideo] = useState('')
  const [contentVideo, setContentVideo] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('events')
      .select('settings')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        const s = (data?.settings ?? {}) as Record<string, unknown>
        setHeroVideo(typeof s.portal_hero_video === 'string' ? s.portal_hero_video : '')
        setContentVideo(typeof s.portal_content_video === 'string' ? s.portal_content_video : '')
        setFetching(false)
      })
  }, [eventId])

  async function handleSave() {
    setLoading(true)
    try {
      await updatePortalVideosAction(eventId, heroVideo, contentVideo)
      toast.success('Vídeos do portal actualizados')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao guardar')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return null

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Video className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-800">Vídeos do portal</h2>
      </div>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        A pré-visualização actualiza ao sair do campo. Se deixar em branco usa o vídeo predefinido.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <VideoField
          label="Vídeo hero (topo)"
          value={heroVideo}
          onChange={setHeroVideo}
          fallback={FALLBACK_HERO}
        />
        <VideoField
          label="Vídeo de fundo (conteúdo)"
          value={contentVideo}
          onChange={setContentVideo}
          fallback={FALLBACK_CONTENT}
        />
      </div>

      <div className="pt-5">
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'A guardar...' : 'Guardar vídeos'}
        </Button>
      </div>
    </div>
  )
}

export { VideoPreview }
