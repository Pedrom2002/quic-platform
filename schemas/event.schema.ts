import { z } from 'zod'

// datetime-local returns "YYYY-MM-DDTHH:MM" — validate it's a real date
const localDatetime = (label: string) =>
  z.string()
    .min(1, `${label} é obrigatória`)
    .refine(val => !isNaN(Date.parse(val)), `${label} inválida`)

const eventBaseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200, 'Nome demasiado longo (máx. 200 caracteres)'),
  event_type_id: z.string().min(1, 'Seleciona um tipo de evento'),
  description: z.string().max(2000, 'Descrição demasiado longa (máx. 2000 caracteres)').optional(),
  venue_name: z.string().max(300, 'Nome do local demasiado longo (máx. 300 caracteres)').optional(),
  venue_address: z.string().max(500, 'Morada demasiado longa (máx. 500 caracteres)').optional(),
  start_datetime: localDatetime('Data de início'),
  end_datetime: localDatetime('Data de fim'),
})

export const createEventSchema = eventBaseSchema.refine(
  data => new Date(data.end_datetime) > new Date(data.start_datetime),
  { message: 'A data de fim deve ser posterior à data de início', path: ['end_datetime'] }
)

export const updateEventSchema = eventBaseSchema.partial().extend({
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  is_public_listed: z.boolean().optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
