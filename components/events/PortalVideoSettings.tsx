'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePortalVideosAction } from '@/app/dashboard/events/[eventId]/edit/actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Video, Check, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVAILABLE_VIDEOS = [
  { id: 'blob-hero', label: 'Luzes de palco', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/144156-784280927.mp4' },
  { id: 'blob-content', label: 'Ambiente noturno', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/45961-447087612.mp4' },
  { id: 'va', label: 'Vídeo A', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/a.mp4' },
  { id: 'vb', label: 'Vídeo B', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/b.mp4' },
  { id: 'vc', label: 'Vídeo C', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/c.mp4' },
  { id: 'v1', label: 'Vídeo 1', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/1630-148614385.mp4' },
  { id: 'v2', label: 'Vídeo 2', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/166707-835224055_medium.mp4' },
  { id: 'v3', label: 'Vídeo 3', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/169951-842348732_medium.mp4' },
  { id: 'v4', label: 'Vídeo 4', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/21118-315137091_medium.mp4' },
  { id: 'v5', label: 'Vídeo 5', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/227353_medium.mp4' },
  { id: 'v6', label: 'Vídeo 6', url: 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/7901-205237744_medium.mp4' },
]

function VideoCard({
  video,
  isSelected,
  onSelect,
}: {
  video: typeof AVAILABLE_VIDEOS[0]
  isSelected: boolean
  onSelect: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [hovering, setHovering] = useState(false)

  function handleMouseEnter() {
    setHovering(true)
    if (ref.current) {
      ref.current.play().catch(() => {})
    }
  }

  function handleMouseLeave() {
    setHovering(false)
    if (ref.current) {
      ref.current.pause()
      ref.current.currentTime = 0
    }
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative rounded-lg overflow-hidden aspect-video border-2 transition-all focus:outline-none bg-slate-900',
        isSelected
          ? 'border-slate-900 ring-2 ring-slate-900/20'
          : 'border-slate-200 hover:border-slate-400',
      )}
    >
      <video
        ref={ref}
        src={video.url}
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />

      {/* dark overlay + play icon when not hovering */}
      <div className={cn(
        'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
        hovering ? 'opacity-0' : 'opacity-100 bg-black/40',
      )}>
        <Play className="w-6 h-6 text-white/60 fill-white/60" />
      </div>

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
}

const NO_VIDEO = ''

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
        {/* Sem vídeo option */}
        <button
          type="button"
          onClick={() => onSelect(NO_VIDEO)}
          className={cn(
            'relative rounded-lg overflow-hidden aspect-video border-2 transition-all focus:outline-none bg-slate-100 flex flex-col items-center justify-center gap-1',
            selected === NO_VIDEO
              ? 'border-slate-900 ring-2 ring-slate-900/20'
              : 'border-slate-200 hover:border-slate-400',
          )}
        >
          <span className="text-slate-400 text-lg">✕</span>
          <span className="text-[10px] text-slate-500 font-medium">Sem vídeo</span>
          {selected === NO_VIDEO && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </span>
          )}
        </button>

        {AVAILABLE_VIDEOS.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            isSelected={selected === video.url}
            onSelect={() => onSelect(video.url)}
          />
        ))}
      </div>
    </div>
  )
}

export function PortalVideoSettings({ eventId }: { eventId: string }) {
  const [heroVideo, setHeroVideo] = useState(AVAILABLE_VIDEOS[0].url)
  const [contentVideo, setContentVideo] = useState(AVAILABLE_VIDEOS[1].url)
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
        Passa o rato por cima para pré-visualizar. Clica para selecionar.
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
