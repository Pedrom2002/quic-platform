import * as z from 'zod'

export const PROJECT_STATUSES = ['coming_soon', 'open', 'closed', 'completed'] as const
export const DOCUMENT_TYPES = ['contract', 'report', 'tax', 'presentation'] as const

export const projectSchema = z.object({
  name: z.string({ error: 'Nome obrigatório' }).trim().min(1, { error: 'Nome obrigatório' }),
  description: z.string().trim().nullable().optional(),
  status: z.enum(PROJECT_STATUSES, { error: 'Estado inválido' }),
  funding_goal_cents: z.number({ error: 'Meta de financiamento obrigatória' }).int().min(1, {
    error: 'Meta de financiamento não pode ser negativa ou zero',
  }),
  capacity: z.number().int().min(0).nullable().optional(),
  investment_deadline: z.iso.date({ error: 'Prazo inválido' }).nullable().optional(),
  actual_revenue_cents: z.number().int().nullable().optional(),
  attendance: z.number().int().min(0).nullable().optional(),
})

export const investmentSchema = z.object({
  investor_id: z.uuid({ error: 'Investidor inválido' }),
  amount_cents: z.number({ error: 'Montante obrigatório' }).int().min(1, {
    error: 'Montante tem de ser maior que zero',
  }),
  invested_at: z.iso.date({ error: 'Data inválida' }),
  projected_return_cents: z.number().int().nullable().optional(),
})

export const documentSchema = z
  .object({
    title: z.string({ error: 'Título obrigatório' }).trim().min(1, { error: 'Título obrigatório' }),
    type: z.enum(DOCUMENT_TYPES, { error: 'Tipo inválido' }),
    investor_id: z.uuid().nullable().optional(),
    project_id: z.uuid().nullable().optional(),
  })
  .refine((data) => Boolean(data.investor_id) !== Boolean(data.project_id), {
    error: 'Associa a um investidor OU a um projeto (apenas um)',
    path: ['project_id'],
  })

export type ProjectInput = z.infer<typeof projectSchema>
export type InvestmentInput = z.infer<typeof investmentSchema>
export type DocumentInput = z.infer<typeof documentSchema>
