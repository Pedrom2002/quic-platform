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
