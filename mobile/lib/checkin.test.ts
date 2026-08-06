import { describe, it, expect, jest } from '@jest/globals'
import { checkInTicket } from './checkin'

describe('checkInTicket', () => {
  it('calls the check_in_ticket RPC and returns its result', async () => {
    const rpc = jest
      .fn<() => Promise<{ data: { success: boolean } | null; error: { message: string } | null }>>()
      .mockResolvedValue({ data: { success: true }, error: null })
    const supabase = { rpc } as never

    const result = await checkInTicket(supabase, 'qr-123')

    expect(rpc).toHaveBeenCalledWith('check_in_ticket', { p_qr_code: 'qr-123' })
    expect(result).toEqual({ success: true })
  })

  it('returns a generic error when the RPC call itself fails', async () => {
    const rpc = jest
      .fn<() => Promise<{ data: { success: boolean } | null; error: { message: string } | null }>>()
      .mockResolvedValue({ data: null, error: { message: 'boom' } })
    const supabase = { rpc } as never

    const result = await checkInTicket(supabase, 'qr-123')
    expect(result).toEqual({ success: false, error: 'Erro ao validar bilhete' })
  })
})
