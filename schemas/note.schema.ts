import { z } from 'zod'

export const createNoteSchema = z.object({
  content: z.string().min(1).max(10000),
})
