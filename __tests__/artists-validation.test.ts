import { describe, it, expect } from 'vitest'
import {
  artistSchema,
  agendaItemSchema,
  clippingSchema,
  assetSchema,
} from '@/lib/artists/validation'

describe('artistSchema', () => {
  it('accepts valid artist', () => {
    const result = artistSchema.safeParse({
      name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '912345678',
      bio: 'Cantora',
      notify_on_publish: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = artistSchema.safeParse({ name: '  ', notify_on_publish: true })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = artistSchema.safeParse({
      name: 'Maria',
      email: 'not-an-email',
      notify_on_publish: false,
    })
    expect(result.success).toBe(false)
  })

  it('accepts null email', () => {
    const result = artistSchema.safeParse({ name: 'Maria', email: null, notify_on_publish: true })
    expect(result.success).toBe(true)
  })
})

describe('agendaItemSchema', () => {
  const base = {
    type: 'show',
    title: 'Concerto em Lisboa',
    starts_at: '2026-08-01T21:00',
    is_visible: true,
  }

  it('accepts valid item', () => {
    expect(agendaItemSchema.safeParse(base).success).toBe(true)
  })

  it('accepts ends_at equal or after starts_at', () => {
    expect(agendaItemSchema.safeParse({ ...base, ends_at: '2026-08-01T23:00' }).success).toBe(true)
  })

  it('rejects ends_at before starts_at', () => {
    const result = agendaItemSchema.safeParse({ ...base, ends_at: '2026-07-31T20:00' })
    expect(result.success).toBe(false)
  })

  it('rejects unknown type', () => {
    expect(agendaItemSchema.safeParse({ ...base, type: 'festa' }).success).toBe(false)
  })

  it('rejects invalid starts_at', () => {
    expect(agendaItemSchema.safeParse({ ...base, starts_at: 'not-a-date' }).success).toBe(false)
  })

  it('rejects non-uuid event_id', () => {
    expect(agendaItemSchema.safeParse({ ...base, event_id: '123' }).success).toBe(false)
  })
})

describe('clippingSchema', () => {
  it('accepts valid clipping', () => {
    const result = clippingSchema.safeParse({
      title: 'Entrevista no jornal',
      source: 'Público',
      url: 'https://publico.pt/artigo',
      published_at: '2026-07-10',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing url', () => {
    expect(clippingSchema.safeParse({ title: 'Artigo' }).success).toBe(false)
  })

  it('rejects invalid published_at', () => {
    const result = clippingSchema.safeParse({
      title: 'Artigo',
      url: 'https://x.pt/a',
      published_at: '10/07/2026',
    })
    expect(result.success).toBe(false)
  })
})

describe('assetSchema', () => {
  const content = {
    section: 'content',
    kind: 'foto',
    title: 'Sessão fotográfica',
    blob_url: 'https://blob.vercel-storage.com/x.jpg',
  }

  it('accepts content with blob_url only', () => {
    expect(assetSchema.safeParse(content).success).toBe(true)
  })

  it('accepts video with external_url only', () => {
    const result = assetSchema.safeParse({
      section: 'content',
      kind: 'video',
      title: 'Aftermovie',
      external_url: 'https://youtube.com/watch?v=abc',
    })
    expect(result.success).toBe(true)
  })

  it('rejects both blob_url and external_url', () => {
    const result = assetSchema.safeParse({ ...content, external_url: 'https://drive.google.com/x' })
    expect(result.success).toBe(false)
  })

  it('rejects neither url', () => {
    const result = assetSchema.safeParse({ section: 'content', kind: 'foto', title: 'X' })
    expect(result.success).toBe(false)
  })

  it('rejects document kind in content section', () => {
    const result = assetSchema.safeParse({ ...content, kind: 'contrato' })
    expect(result.success).toBe(false)
  })

  it('rejects content kind in document section', () => {
    const result = assetSchema.safeParse({ ...content, section: 'document', kind: 'foto' })
    expect(result.success).toBe(false)
  })

  it('accepts document contrato with blob_url', () => {
    const result = assetSchema.safeParse({
      section: 'document',
      kind: 'contrato',
      title: 'Contrato 2026',
      blob_url: 'https://blob.vercel-storage.com/c.pdf',
    })
    expect(result.success).toBe(true)
  })

  it('accepts kind outro em ambas as secções', () => {
    expect(assetSchema.safeParse({ ...content, kind: 'outro' }).success).toBe(true)
    expect(
      assetSchema.safeParse({
        section: 'document',
        kind: 'outro',
        title: 'Doc',
        blob_url: 'https://blob.vercel-storage.com/d.pdf',
      }).success
    ).toBe(true)
  })
})
