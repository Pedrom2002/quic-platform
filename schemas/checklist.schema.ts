import { z } from 'zod'

export const updateChecklistItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  title: z.string().min(1).optional(),
  client_label: z.string().max(200).nullable().optional(),
  description: z.string().optional(),
  is_client_visible: z.boolean().optional(),
  completion_note: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  position: z.number().int().positive().optional(),
})

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  client_label: z.string().max(200).nullable().optional(),
  description: z.string().optional(),
  is_client_visible: z.boolean().default(true),
  assigned_to: z.string().uuid().nullable().optional(),
  position: z.number().int().positive(),
})

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>
