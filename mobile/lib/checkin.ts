import type { SupabaseClient } from '@supabase/supabase-js'

export interface CheckInResult {
  success: boolean
  error?: string
}

export async function checkInTicket(supabase: SupabaseClient, qrCode: string): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('check_in_ticket', { p_qr_code: qrCode })
  if (error) return { success: false, error: 'Erro ao validar bilhete' }
  return data as CheckInResult
}
