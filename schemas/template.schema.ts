import { z } from 'zod'

export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  channel: z.enum(['email', 'whatsapp', 'sms', 'portal']),
  language: z.enum(['pt', 'en']).default('pt'),
  subject: z.string().optional(),
  body_template: z.string().min(1, 'Corpo obrigatório'),
})

export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>
