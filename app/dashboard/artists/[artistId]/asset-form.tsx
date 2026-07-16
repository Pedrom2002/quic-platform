'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { ArtistAssetKind, ArtistAssetSection } from '@/types/app'
import { assetKindLabels } from '@/lib/artists/format'
import { CONTENT_KINDS, DOCUMENT_KINDS } from '@/lib/artists/validation'
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

import { createAsset } from '../content-actions'

export function AssetForm({
  artistId,
  section,
  notifyDefault,
  hasEmail,
  onSuccess,
}: {
  artistId: string
  section: ArtistAssetSection
  notifyDefault?: boolean
  hasEmail?: boolean
  onSuccess?: () => void
}) {
  const kinds = section === 'content' ? CONTENT_KINDS : DOCUMENT_KINDS
  const [kind, setKind] = useState<ArtistAssetKind>(kinds[0])
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [isPending, startTransition] = useTransition()

  const idPrefix = `asset-${section}`

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createAsset(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(section === 'content' ? 'Conteúdo adicionado' : 'Documento adicionado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="artist_id" value={artistId} />
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="kind" value={kind} />

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label>Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind((v as ArtistAssetKind) ?? kind)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((value) => (
                <SelectItem key={value} value={value}>
                  {assetKindLabels[value]}
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
            placeholder={section === 'content' ? 'Ex.: Sessão fotográfica verão' : 'Ex.: Rider técnico 2026'}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Origem</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'file' ? 'default' : 'outline'}
            onClick={() => setMode('file')}
          >
            Ficheiro
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'link' ? 'default' : 'outline'}
            onClick={() => setMode('link')}
          >
            Link externo
          </Button>
        </div>
      </div>

      {mode === 'file' ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-file`}>Ficheiro (máx. 50 MB)</Label>
          <Input id={`${idPrefix}-file`} name="file" type="file" />
          <p className="text-xs text-muted-foreground">
            Para vídeos grandes usa um link externo (Drive, YouTube, WeTransfer).
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-external`}>Link externo</Label>
          <Input
            id={`${idPrefix}-external`}
            name="external_url"
            type="url"
            placeholder="https://drive.google.com/..."
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notas</Label>
        <Textarea id={`${idPrefix}-notes`} name="notes" rows={2} placeholder="Opcional" />
      </div>

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

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : 'Adicionar'}
      </Button>
    </form>
  )
}
