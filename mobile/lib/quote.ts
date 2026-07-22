// mobile/lib/quote.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface QuoteFormInput {
  name: string
  email: string
  phone: string
  eventDate: string
  message: string
}

export interface CartLine {
  materialId: string
  qty: number
}

export type QuoteResult = { success: true } | { success: false; error: string }

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const GENERIC_ERROR = 'Não foi possível submeter o pedido. Tente novamente.'

export function validateQuote(form: QuoteFormInput, items: CartLine[]): string | null {
  if (form.name.trim() === '') return 'Nome obrigatório'
  if (!EMAIL_REGEX.test(form.email.trim())) return 'Email inválido'
  if (items.length === 0) return 'Adicione pelo menos um material ao pedido'
  return null
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export async function submitQuote(
  supabase: SupabaseClient,
  form: QuoteFormInput,
  items: CartLine[]
): Promise<QuoteResult> {
  try {
    const { error } = await supabase.rpc('stock_submit_quote', {
      p_name: form.name.trim(),
      p_email: form.email.trim(),
      p_phone: emptyToNull(form.phone),
      p_event_date: emptyToNull(form.eventDate),
      p_message: emptyToNull(form.message),
      p_items: items,
    })

    if (error) {
      if (error.message.includes('rate_limit')) {
        return { success: false, error: 'Demasiados pedidos. Tente novamente mais tarde.' }
      }
      if (error.message.includes('invalid_items')) {
        return { success: false, error: 'Pedido inválido.' }
      }
      return { success: false, error: GENERIC_ERROR }
    }

    return { success: true }
  } catch {
    return { success: false, error: GENERIC_ERROR }
  }
}
