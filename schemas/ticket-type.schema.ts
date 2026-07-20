import { z } from 'zod'

export const createTicketTypeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome demasiado longo'),
  description: z.string().max(500, 'Descrição demasiado longa').optional(),
  price_cents: z.coerce.number().int().min(0, 'Preço não pode ser negativo'),
  quantity_total: z.coerce.number().int().min(1, 'Quantidade tem de ser pelo menos 1'),
})

export const updateTicketTypeSchema = createTicketTypeSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type CreateTicketTypeInput = z.infer<typeof createTicketTypeSchema>
export type UpdateTicketTypeInput = z.infer<typeof updateTicketTypeSchema>
