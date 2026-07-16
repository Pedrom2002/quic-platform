import * as z from 'zod'

// datetime-local devolve "YYYY-MM-DDTHH:MM" (sem timezone); valida que é data real
const localDatetime = (label: string) =>
  z
    .string({ error: `${label} obrigatória` })
    .min(1, { error: `${label} obrigatória` })
    .refine((val) => !isNaN(Date.parse(val)), { error: `${label} inválida` })

export const CONTENT_KINDS = ['foto', 'video', 'arte', 'outro'] as const
export const DOCUMENT_KINDS = ['contrato', 'rider', 'epk', 'fatura', 'outro'] as const

export const artistSchema = z.object({
  name: z.string({ error: 'Nome obrigatório' }).trim().min(1, {
    error: 'Nome obrigatório',
  }),
  email: z.email({ error: 'Email inválido' }).nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  bio: z.string().trim().max(2000, { error: 'Bio demasiado longa (máx. 2000 caracteres)' }).nullable().optional(),
  notify_on_publish: z.boolean(),
})

export const agendaItemSchema = z
  .object({
    type: z.enum(['show', 'ensaio', 'entrevista', 'viagem', 'gravacao', 'outro'], {
      error: 'Tipo inválido',
    }),
    title: z.string({ error: 'Título obrigatório' }).trim().min(1, {
      error: 'Título obrigatório',
    }),
    starts_at: localDatetime('Data de início'),
    ends_at: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { error: 'Data de fim inválida' })
      .nullable()
      .optional(),
    location: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    event_id: z.uuid({ error: 'Evento inválido' }).nullable().optional(),
    is_visible: z.boolean(),
  })
  .refine(
    (data) => !data.ends_at || new Date(data.ends_at) >= new Date(data.starts_at),
    { error: 'Data de fim anterior ao início', path: ['ends_at'] }
  )

export const clippingSchema = z.object({
  title: z.string({ error: 'Título obrigatório' }).trim().min(1, {
    error: 'Título obrigatório',
  }),
  source: z.string().trim().nullable().optional(),
  url: z.url({ error: 'Link do artigo inválido' }),
  image_url: z.url({ error: 'URL da imagem inválido' }).nullable().optional(),
  published_at: z.iso.date({ error: 'Data de publicação inválida' }).nullable().optional(),
})

export const assetSchema = z
  .object({
    section: z.enum(['content', 'document'], { error: 'Secção inválida' }),
    kind: z.enum(['foto', 'video', 'arte', 'contrato', 'rider', 'epk', 'fatura', 'outro'], {
      error: 'Tipo inválido',
    }),
    title: z.string({ error: 'Título obrigatório' }).trim().min(1, {
      error: 'Título obrigatório',
    }),
    blob_url: z.url({ error: 'URL do ficheiro inválido' }).nullable().optional(),
    external_url: z.url({ error: 'Link externo inválido' }).nullable().optional(),
    thumbnail_url: z.url({ error: 'URL da thumbnail inválido' }).nullable().optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .refine((data) => Boolean(data.blob_url) !== Boolean(data.external_url), {
    error: 'Indica um ficheiro ou um link externo (apenas um)',
    path: ['external_url'],
  })
  .refine(
    (data) =>
      data.section === 'content'
        ? (CONTENT_KINDS as readonly string[]).includes(data.kind)
        : (DOCUMENT_KINDS as readonly string[]).includes(data.kind),
    { error: 'Tipo não corresponde à secção', path: ['kind'] }
  )

export type ArtistInput = z.infer<typeof artistSchema>
export type AgendaItemInput = z.infer<typeof agendaItemSchema>
export type ClippingInput = z.infer<typeof clippingSchema>
export type AssetInput = z.infer<typeof assetSchema>
