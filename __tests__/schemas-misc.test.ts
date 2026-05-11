import { describe, it, expect } from 'vitest'
import { createNoteSchema } from '@/schemas/note.schema'
import { messageTemplateSchema } from '@/schemas/template.schema'

describe('createNoteSchema', () => {
  it('accepts valid content', () => {
    expect(createNoteSchema.safeParse({ content: 'Hello' }).success).toBe(true)
  })

  it('rejects empty content', () => {
    expect(createNoteSchema.safeParse({ content: '' }).success).toBe(false)
  })

  it('rejects content over 10000 chars', () => {
    expect(createNoteSchema.safeParse({ content: 'A'.repeat(10001) }).success).toBe(false)
  })

  it('accepts content at max length (10000 chars)', () => {
    expect(createNoteSchema.safeParse({ content: 'A'.repeat(10000) }).success).toBe(true)
  })
})

describe('messageTemplateSchema', () => {
  const validBase = {
    name: 'Notificação',
    channel: 'email',
    body_template: 'Olá {{client_name}}',
  }

  it('accepts valid input', () => {
    expect(messageTemplateSchema.safeParse(validBase).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(messageTemplateSchema.safeParse({ ...validBase, name: '' }).success).toBe(false)
  })

  it('rejects invalid channel', () => {
    expect(messageTemplateSchema.safeParse({ ...validBase, channel: 'fax' }).success).toBe(false)
  })

  it('accepts all valid channels', () => {
    for (const channel of ['email', 'whatsapp', 'sms', 'portal']) {
      expect(messageTemplateSchema.safeParse({ ...validBase, channel }).success).toBe(true)
    }
  })

  it('defaults language to pt', () => {
    const result = messageTemplateSchema.safeParse(validBase)
    if (result.success) expect(result.data.language).toBe('pt')
  })

  it('accepts en language', () => {
    expect(messageTemplateSchema.safeParse({ ...validBase, language: 'en' }).success).toBe(true)
  })

  it('rejects invalid language', () => {
    expect(messageTemplateSchema.safeParse({ ...validBase, language: 'fr' }).success).toBe(false)
  })

  it('rejects empty body_template', () => {
    expect(messageTemplateSchema.safeParse({ ...validBase, body_template: '' }).success).toBe(false)
  })

  it('accepts optional subject', () => {
    expect(messageTemplateSchema.safeParse({ ...validBase, subject: 'Assunto' }).success).toBe(true)
  })
})
