'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePortalVideosAction } from '@/app/dashboard/events/[eventId]/edit/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Video, ExternalLink } from 'lucide-react'

const FALLBACK_HERO = 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/144156-784280927.mp4'
const FALLBACK_CONTENT = 'https://0q7kycaotkbutqsj.public.blob.vercel-storage.com/45961-447087612.mp4'

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
      <div className="flex items-center gap-2 mb-5">
        <Video className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-800">Vídeos do portal</h2>
      </div>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        URLs de vídeo (.mp4) que aparecem como fundo no portal do cliente. Se deixar em branco é usado o vídeo predefinido.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-slate-600">Vídeo hero (topo)</Label>
          <Input
            value={heroVideo}
            onChange={e => setHeroVideo(e.target.value)}
            placeholder={FALLBACK_HERO}
            className="bg-white border-slate-200 text-xs font-mono"
          />
          {heroVideo && (
            <a
              href={heroVideo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors mt-1"
            >
              <ExternalLink className="w-3 h-3" /> Pré-visualizar
            </a>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-600">Vídeo de fundo (conteúdo)</Label>
          <Input
            value={contentVideo}
            onChange={e => setContentVideo(e.target.value)}
            placeholder={FALLBACK_CONTENT}
            className="bg-white border-slate-200 text-xs font-mono"
          />
          {contentVideo && (
            <a
              href={contentVideo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors mt-1"
            >
              <ExternalLink className="w-3 h-3" /> Pré-visualizar
            </a>
          )}
        </div>
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'A guardar...' : 'Guardar vídeos'}
        </Button>
      </div>
    </div>
  )
}
