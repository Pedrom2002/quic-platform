'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePortalVideosAction } from '@/app/dashboard/events/[eventId]/edit/actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Video, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVAILABLE_VIDEOS = [
  { id: 'v1', label: 'Vídeo 1', url: '/1630-148614385.mp4' },
  { id: 'v2', label: 'Vídeo 2', url: '/166707-835224055_medium.mp4' },
  { id: 'v3', label: 'Vídeo 3', url: '/169951-842348732_medium.mp4' },
  { id: 'v4', label: 'Vídeo 4', url: '/21118-315137091_medium.mp4' },
  { id: 'v5', label: 'Vídeo 5', url: '/227353_medium.mp4' },
  { id: 'v6', label: 'Vídeo 6', url: '/7901-205237744_medium.mp4' },
  { id: 'blob-hero', label: 'Luzes de palco', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/144156-784280927.mp4' },
  { id: 'blob-content', label: 'Ambiente noturno', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/45961-447087612.mp4' },
]

function VideoPicker({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: string
  onSelect: (url: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-3">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {AVAILABLE_VIDEOS.map(video => {
          const isSelected = selected === video.url
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onSelect(video.url)}
              className={cn(
                'relative rounded-lg overflow-hidden aspect-video border-2 transition-all focus:outline-none',
                isSelected
                  ? 'border-slate-900 ring-2 ring-slate-900/20'
                  : 'border-slate-200 hover:border-slate-400',
              )}
            >
              <video
                src={video.url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <div className={cn(
                'absolute inset-0 transition-colors',
                isSelected ? 'bg-black/20' : 'bg-black/10 hover:bg-black/0',
              )} />
              <span className="absolute bottom-1.5 left-2 text-[10px] text-white font-medium tracking-wide drop-shadow">
                {video.label}
              </span>
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PortalVideoSettings({ eventId }: { eventId: string }) {
  const [heroVideo, setHeroVideo] = useState(AVAILABLE_VIDEOS[6].url)
  const [contentVideo, setContentVideo] = useState(AVAILABLE_VIDEOS[7].url)
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
        if (typeof s.portal_hero_video === 'string' && s.portal_hero_video) {
          setHeroVideo(s.portal_hero_video)
        }
        if (typeof s.portal_content_video === 'string' && s.portal_content_video) {
          setContentVideo(s.portal_content_video)
        }
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
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        Escolhe o vídeo de fundo para cada secção do portal do cliente.
      </p>

      <div className="space-y-6">
        <VideoPicker
          label="Vídeo hero (topo)"
          selected={heroVideo}
          onSelect={setHeroVideo}
        />
        <div className="border-t border-slate-100" />
        <VideoPicker
          label="Vídeo de fundo (conteúdo)"
          selected={contentVideo}
          onSelect={setContentVideo}
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
