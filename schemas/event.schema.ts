import { z } from 'zod'

// datetime-local returns "YYYY-MM-DDTHH:MM" — validate it's a real date
const localDatetime = (label: string) =>
  z.string()
    .min(1, `${label} é obrigatória`)
    .refine(val => !isNaN(Date.parse(val)), `${label} inválida`)

const eventBaseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  event_type_id: z.string().min(1, 'Seleciona um tipo de evento'),
  description: z.string().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  start_datetime: localDatetime('Data de início'),
  end_datetime: localDatetime('Data de fim'),
})

export const createEventSchema = eventBaseSchema.refine(
  data => new Date(data.end_datetime) > new Date(data.start_datetime),
  { message: 'A data de fim deve ser posterior à data de início', path: ['end_datetime'] }
)

export const updateEventSchema = eventBaseSchema.partial().extend({
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
