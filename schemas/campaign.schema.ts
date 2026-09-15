import { z } from 'zod'

export const createCampaignSchema = z.object({
  list_id: z.string().uuid('Lista inválida'),
  name: z.string().min(1, 'Nome obrigatório').max(200),
  subject_template: z.string().min(1, 'Assunto obrigatório').max(500),
  body_template: z.string().min(1, 'Corpo obrigatório').max(200000),
  ai_objective: z.string().max(2000).optional(),
  ai_personalize: z.boolean().default(false),
  schedule_now: z.boolean().default(false),
  scheduled_at: z.string().optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
