import { z } from 'zod'

export const updateChecklistItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  title: z.string().min(1).optional(),
  client_label: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).optional(),
  is_client_visible: z.boolean().optional(),
  completion_note: z.string().max(5000).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  position: z.number().int().positive().optional(),
  category: z.string().max(100).nullable().optional(),
})

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  client_label: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).optional(),
  is_client_visible: z.boolean().default(true),
  assigned_to: z.string().uuid().nullable().optional(),
  position: z.number().int().positive(),
  category: z.string().max(100).nullable().optional(),
})

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>
