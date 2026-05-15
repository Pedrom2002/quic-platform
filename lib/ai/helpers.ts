import { type NextRequest } from 'next/server'
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import { type ZodType } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAiRateLimited } from '@/lib/ai-rate-limit'
import { getEnv } from '@/lib/env'

export type AiAuthContext = {
  userId: string
  organizationId: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function withAiAuth<T>(
  req: NextRequest,
  schema: ZodType<T>,
  handler: (ctx: AiAuthContext, body: T) => Promise<Response>
): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return new Response('Forbidden', { status: 403 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return new Response('Bad Request', { status: 400 })

  if (await isAiRateLimited(member.organization_id)) {
    return new Response('Too Many Requests', { status: 429 })
  }

  if (!getEnv().GEMINI_API_KEY) {
    return new Response('AI não disponível', { status: 503 })
  }

  return handler(
    { userId: user.id, organizationId: member.organization_id, supabase },
    parsed.data
  )
}

export function createGeminiModel(systemInstruction: string): GenerativeModel {
  const genAI = new GoogleGenerativeAI(getEnv().GEMINI_API_KEY!)
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction })
}

export function streamGeminiResponse(
  model: GenerativeModel,
  prompt: string,
  errorChunk: string
): Response {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(prompt)
        for await (const chunk of result.stream) {
          controller.enqueue(encoder.encode(chunk.text()))
        }
      } catch {
        controller.enqueue(encoder.encode(errorChunk))
      } finally {
        controller.close()
      }
    },
  })
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
