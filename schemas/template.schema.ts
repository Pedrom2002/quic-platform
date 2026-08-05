import { z } from 'zod'

export const TEMPLATE_KEYS = ['checklist_complete', 'welcome', 'client_update', 'custom'] as const
export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  channel: z.enum(['email', 'whatsapp', 'sms', 'portal', 'push']),
  language: z.enum(['pt', 'en']).default('pt'),
  template_key: z.enum(TEMPLATE_KEYS).default('custom'),
  subject: z.string().max(500).optional(),
  body_template: z.string().min(1, 'Corpo obrigatório').max(50000),
})

export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>
