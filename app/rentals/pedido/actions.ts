'use server'

import { createClient } from '@/lib/supabase/server'
import { quoteRequestSchema } from '@/lib/stock/validation'

export type QuoteActionResult =
  | { success: true }
  | { success: false; error: string }

export type QuoteRequestPayload = {
  name: string
  email: string
  phone: string
  event_date: string
  message: string
  /** honeypot anti-spam: tem de chegar vazio */
  website: string
  items: { materialId: string; qty: number }[]
}

const GENERIC_ERROR = 'Não foi possível submeter o pedido. Tente novamente.'

function emptyToUndefined(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

// Ação anónima: NÃO verifica auth. O cliente server sem sessão atua como
// anon e as políticas RLS de INSERT para anon aplicam-se.
export async function submitQuoteRequest(
  input: QuoteRequestPayload
): Promise<QuoteActionResult> {
  // Honeypot: bots preenchem o campo escondido; fingir sucesso sem gravar.
  if (typeof input?.website === 'string' && input.website.trim() !== '') {
    return { success: true }
  }

  const parsed = quoteRequestSchema.safeParse({
    name: input?.name,
    email: input?.email,
    phone: emptyToUndefined(input?.phone),
    event_date: emptyToUndefined(input?.event_date),
    message: emptyToUndefined(input?.message),
    items: input?.items,
  })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join('; '),
    }
  }

  const supabase = await createClient()

  // RPC atómica (security definer): insere pedido + itens numa transação,
  // aplica rate-limit e validação. anon tem execute; sem sessão. Qualquer
  // raise dentro da função faz rollback (sem pedidos órfãos).
  const { error } = await supabase.rpc('stock_submit_quote', {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone ?? null,
    p_event_date: parsed.data.event_date ?? null,
    p_message: parsed.data.message ?? null,
    p_items: parsed.data.items,
  })

  if (error) {
    if (error.message.includes('rate_limit')) {
      return {
        success: false,
        error: 'Demasiados pedidos. Tente novamente mais tarde.',
      }
    }
    if (error.message.includes('invalid_items')) {
      return { success: false, error: 'Pedido inválido.' }
    }
    return { success: false, error: GENERIC_ERROR }
  }

  return { success: true }
}
