/**
 * Tests for marketing Server Actions:
 *   - app/dashboard/marketing/contacts/actions.ts   (createList)
 *   - app/dashboard/marketing/settings/actions.ts   (saveSmtpCredentials, testSmtpCredentials)
 *   - app/dashboard/marketing/campaigns/new/actions.ts (createCampaign — incl. list ownership)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockAdminFrom, mockRedirect, mockRevalidate, mockEncrypt, mockTestSmtp, mockPublishJSON } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockRedirect: vi.fn(),
  mockRevalidate: vi.fn(),
  mockEncrypt: vi.fn(() => 'enc-pw'),
  mockTestSmtp: vi.fn(),
  mockPublishJSON: vi.fn().mockResolvedValue({ messageId: 'm1' }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))
vi.mock('@/lib/marketing/crypto', () => ({ encryptPassword: mockEncrypt }))
vi.mock('@/lib/marketing/smtp', () => ({ testSmtpConnection: mockTestSmtp }))
vi.mock('@upstash/qstash', () => ({ Client: function Client() { return { publishJSON: mockPublishJSON } } }))

function fd(obj: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(obj)) f.append(k, v)
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockEncrypt.mockReturnValue('enc-pw')
})

// ─── createList ───────────────────────────────────────────────────────────────

describe('createList', () => {
  it('throws when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { createList } = await import('@/app/dashboard/marketing/contacts/actions')
    await expect(createList(fd({ name: 'Lista A' }))).rejects.toThrow('Não autenticado')
  })

  it('inserts a list scoped to the user and revalidates', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert })
    const { createList } = await import('@/app/dashboard/marketing/contacts/actions')
    await createList(fd({ name: 'Lista A' }))
    expect(insert).toHaveBeenCalledWith({ name: 'Lista A', created_by: 'user-1' })
    expect(mockRevalidate).toHaveBeenCalled()
  })
})

// ─── saveSmtpCredentials / testSmtpCredentials ─────────────────────────────────

describe('saveSmtpCredentials', () => {
  // Form-action signature: (prevState, formData) → { ok, message } (never throws).
  it('returns not-authenticated message when no user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { saveSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    expect(await saveSmtpCredentials(null, fd({ password: 'x' }))).toEqual({ ok: false, message: 'Não autenticado' })
  })

  it('encrypts the password, upserts by user_id and verifies', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ upsert, update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) })
    mockTestSmtp.mockResolvedValueOnce(undefined)
    const { saveSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    const res = await saveSmtpCredentials(null, fd({ host: 'smtp.x.com', port: '587', username: 'u', password: 'secret', from_name: 'S' }))
    expect(mockEncrypt).toHaveBeenCalledWith('secret')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', host: 'smtp.x.com', port: 587, password_enc: 'enc-pw' }),
      { onConflict: 'user_id' },
    )
    expect(res).toEqual({ ok: true, message: 'Guardado e verificado com sucesso' })
  })

  it('returns ok with a warning when verification fails', async () => {
    mockFrom.mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) })
    mockTestSmtp.mockRejectedValueOnce(new Error('auth failed'))
    const { saveSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    const res = await saveSmtpCredentials(null, fd({ host: 'h', port: '587', username: 'u', password: 'p', from_name: 'S' }))
    expect(res.ok).toBe(true)
    expect(res.message).toContain('verificação falhou')
  })

  it('returns error when upsert fails', async () => {
    mockFrom.mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) })
    const { saveSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    const res = await saveSmtpCredentials(null, fd({ host: 'h', port: '587', username: 'u', password: 'p', from_name: 'S' }))
    expect(res.ok).toBe(false)
    expect(res.message).toContain('Erro ao guardar')
  })
})

describe('testSmtpCredentials', () => {
  it('returns not-authenticated error when no user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { testSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    expect(await testSmtpCredentials()).toEqual({ ok: false, error: 'Não autenticado' })
  })

  it('returns error when no stored credentials', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })
    const { testSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    expect(await testSmtpCredentials()).toEqual({ ok: false, error: 'Credenciais não guardadas' })
  })

  it('verifies connection and marks verified_at on success', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { host: 'h', username: 'u', password_enc: 'e' } }),
      update: vi.fn().mockReturnValue({ eq: updateEq }),
    })
    mockTestSmtp.mockResolvedValueOnce(undefined)
    const { testSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    expect(await testSmtpCredentials()).toEqual({ ok: true })
    expect(updateEq).toHaveBeenCalled()
  })

  it('returns error when connection test throws', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { host: 'h', username: 'u', password_enc: 'e' } }),
    })
    mockTestSmtp.mockRejectedValueOnce(new Error('auth failed'))
    const { testSmtpCredentials } = await import('@/app/dashboard/marketing/settings/actions')
    expect(await testSmtpCredentials()).toEqual({ ok: false, error: 'auth failed' })
  })
})

// ─── createCampaign (list ownership — P1/H fix) ────────────────────────────────

describe('createCampaign', () => {
  const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

  it('throws when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await expect(createCampaign(fd({ list_id: LIST_ID }))).rejects.toThrow('Não autenticado')
  })

  it('throws when the list does not belong to the user (ownership check)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }), // RLS hides foreign list
    })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await expect(createCampaign(fd({ list_id: LIST_ID, name: 'C' }))).rejects.toThrow('Lista não encontrada')
  })

  it('creates the campaign and redirects when list is owned (no immediate dispatch)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'marketing_lists') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: LIST_ID } }) }
      }
      // marketing_campaigns insert().select().single()
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null }) }),
        }),
      }
    })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await createCampaign(fd({
      list_id: LIST_ID, name: 'Campanha', subject_template: 'S', body_template: 'B',
      schedule_now: 'false',
    }))
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard/marketing/campaigns/camp-1')
    expect(mockPublishJSON).not.toHaveBeenCalled()
  })
})
