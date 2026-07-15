import * as z from 'zod'

export const quoteRequestSchema = z.object({
  name: z.string({ error: 'Nome obrigatório' }).trim().min(1, {
    error: 'Nome obrigatório',
  }),
  email: z.email({ error: 'Email inválido' }),
  phone: z.string({ error: 'Telefone inválido' }).trim().optional(),
  event_date: z.iso.date({ error: 'Data do evento inválida' }).optional(),
  message: z.string({ error: 'Mensagem inválida' }).trim().optional(),
  items: z
    .array(
      z.object({
        materialId: z.uuid({ error: 'Material inválido' }),
        qty: z
          .number({ error: 'Quantidade inválida' })
          .int({ error: 'Quantidade tem de ser um número inteiro' })
          .positive({ error: 'Quantidade tem de ser maior que 0' }),
      }),
      { error: 'Itens do pedido inválidos' }
    )
    .min(1, { error: 'Adicione pelo menos um material ao pedido' }),
})

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>

export const categorySchema = z.object({
  name: z.string({ error: 'Nome obrigatório' }).trim().min(1, {
    error: 'Nome obrigatório',
  }),
  sort_order: z.coerce
    .number({ error: 'Ordem inválida' })
    .int({ error: 'Ordem tem de ser um número inteiro' })
    .min(0, { error: 'Ordem tem de ser maior ou igual a 0' }),
})

export const materialSchema = z.object({
  name: z.string({ error: 'Nome obrigatório' }).trim().min(1, {
    error: 'Nome obrigatório',
  }),
  description: z.string().trim().optional(),
  category_id: z
    .uuid({ error: 'Categoria inválida' })
    .nullable()
    .optional(),
  unit: z
    .string({ error: 'Unidade obrigatória' })
    .trim()
    .min(1, { error: 'Unidade obrigatória' })
    .default('un'),
  quantity_total: z.coerce
    .number({ error: 'Quantidade inválida' })
    .int({ error: 'Quantidade tem de ser um número inteiro' })
    .min(0, { error: 'Quantidade tem de ser maior ou igual a 0' }),
  is_public: z.boolean(),
  active: z.boolean(),
})

export const eventSchema = z
  .object({
    name: z.string({ error: 'Nome obrigatório' }).trim().min(1, {
      error: 'Nome obrigatório',
    }),
    client_name: z.string().trim().nullable().optional(),
    starts_on: z.iso
      .date({ error: 'Data de início inválida' })
      .nullable()
      .optional(),
    ends_on: z.iso
      .date({ error: 'Data de fim inválida' })
      .nullable()
      .optional(),
    status: z.enum(['planeado', 'em_curso', 'concluido'], {
      error: 'Estado inválido',
    }),
    notes: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => !data.starts_on || !data.ends_on || data.ends_on >= data.starts_on,
    { error: 'Data de fim anterior ao início', path: ['ends_on'] }
  )

export const movementSchema = z
  .object({
    material_id: z.uuid({ error: 'Material inválido' }),
    event_id: z.uuid({ error: 'Evento inválido' }).nullable().optional(),
    type: z.enum(['saida', 'entrada', 'dano', 'ajuste'], {
      error: 'Tipo de movimento inválido',
    }),
    quantity: z.coerce
      .number({ error: 'Quantidade inválida' })
      .int({ error: 'Quantidade tem de ser um número inteiro' }),
    notes: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.quantity !== 0, {
    error: 'Quantidade não pode ser 0',
    path: ['quantity'],
  })
  .refine((data) => data.type === 'ajuste' || data.quantity > 0, {
    error: 'Quantidade tem de ser maior que 0',
    path: ['quantity'],
  })

export type CategoryInput = z.infer<typeof categorySchema>
export type MaterialInput = z.infer<typeof materialSchema>
export type EventInput = z.infer<typeof eventSchema>
export type MovementInput = z.infer<typeof movementSchema>
