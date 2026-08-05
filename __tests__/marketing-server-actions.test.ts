/**
 * Tests for marketing Server Actions:
 *   - app/dashboard/marketing/contacts/actions.ts   (createList, addContact, deleteContact)
 *   - app/dashboard/marketing/settings/actions.ts   (saveSmtpCredentials, testSmtpCredentials)
 *   - app/dashboard/marketing/campaigns/new/actions.ts (createCampaign — incl. list ownership, dispatchCampaignSends)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockAdminFrom, mockRedirect, mockRevalidate, mockEncrypt, mockTestSmtp, mockPublishJSON, mockRequireOrgAuth, mockGetOrgAuth } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockRedirect: vi.fn(),
  mockRevalidate: vi.fn(),
  mockEncrypt: vi.fn(() => 'enc-pw'),
  mockTestSmtp: vi.fn(),
  mockPublishJSON: vi.fn().mockResolvedValue({ messageId: 'm1' }),
  mockRequireOrgAuth: vi.fn(),
  mockGetOrgAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))
vi.mock('@/lib/supabase/actions', () => ({
  requireOrgAuth: mockRequireOrgAuth,
  getOrgAuth: mockGetOrgAuth,
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))
vi.mock('@/lib/marketing/crypto', () => ({ encryptPassword: mockEncrypt }))
vi.mock('@/lib/marketing/smtp', () => ({ testSmtpConnection: mockTestSmtp }))
vi.mock('@upstash/qstash', () => ({ Client: function Client() { return { publishJSON: mockPublishJSON } } }))

const MEMBER = { organization_id: 'org-1' }

function authAll(supabase: unknown, user: { id: string } = { id: 'user-1' }) {
  const auth = { supabase, user, member: MEMBER }
  mockRequireOrgAuth.mockResolvedValue(auth)
  mockGetOrgAuth.mockResolvedValue(auth)
}

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
    mockRequireOrgAuth.mockRejectedValueOnce(new Error('Não autenticado'))
    const { createList } = await import('@/app/dashboard/marketing/contacts/actions')
    await expect(createList(fd({ name: 'Lista A' }))).rejects.toThrow('Não autenticado')
  })

  it('inserts a list scoped to the user and revalidates', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    authAll({ from: vi.fn().mockReturnValue({ insert }) })
    const { createList } = await import('@/app/dashboard/marketing/contacts/actions')
    await createList(fd({ name: 'Lista A' }))
    expect(insert).toHaveBeenCalledWith({ name: 'Lista A', created_by: 'user-1', organization_id: 'org-1' })
    expect(mockRevalidate).toHaveBeenCalled()
  })
})

// ─── addContact / deleteContact ─────────────────────────────────────────────

describe('addContact', () => {
  it('returns not-authenticated message when getOrgAuth fails', async () => {
    mockGetOrgAuth.mockResolvedValueOnce(null)
    const { addContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await addContact(null, fd({ list_id: 'list-1', email: 'a@b.com' }))
    expect(result).toEqual({ ok: false, message: 'Não autenticado' })
  })

  it('rejects invalid email without hitting the DB', async () => {
    const from = vi.fn()
    authAll({ from })
    const { addContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await addContact(null, fd({ list_id: 'list-1', email: 'not-an-email' }))
    expect(result).toEqual({ ok: false, message: 'Email inválido' })
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects missing email without hitting the DB', async () => {
    const from = vi.fn()
    authAll({ from })
    const { addContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await addContact(null, fd({ list_id: 'list-1' }))
    expect(result).toEqual({ ok: false, message: 'Email inválido' })
    expect(from).not.toHaveBeenCalled()
  })

  function makeAddContactFrom(insert: ReturnType<typeof vi.fn>) {
    return vi.fn((table: string) => {
      if (table === 'marketing_lists') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'list-1' } }),
              }),
            }),
          }),
        }
      }
      return { insert }
    })
  }

  it('inserts contact scoped to the member organization_id, trimmed/lowercased', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    authAll({ from: makeAddContactFrom(insert) })
    const { addContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await addContact(
      null,
      fd({ list_id: 'list-1', email: '  Foo@Bar.com  ', name: ' Ana ', company: ' Acme ', role: ' CEO ' })
    )
    expect(insert).toHaveBeenCalledWith({
      list_id: 'list-1',
      email: 'foo@bar.com',
      name: 'Ana',
      company: 'Acme',
      role: 'CEO',
      organization_id: 'org-1',
    })
    expect(result).toEqual({ ok: true, message: 'foo@bar.com adicionado' })
    expect(mockRevalidate).toHaveBeenCalled()
  })

  it('maps duplicate-email db error (23505) to friendly message', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })
    authAll({ from: makeAddContactFrom(insert) })
    const { addContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await addContact(null, fd({ list_id: 'list-1', email: 'foo@bar.com' }))
    expect(result).toEqual({ ok: false, message: 'Email já existe nesta lista' })
  })

  it('surfaces generic db error message', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: '500', message: 'db down' } })
    authAll({ from: makeAddContactFrom(insert) })
    const { addContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await addContact(null, fd({ list_id: 'list-1', email: 'foo@bar.com' }))
    expect(result).toEqual({ ok: false, message: 'db down' })
  })
})

describe('deleteContact', () => {
  it('returns ok:false when getOrgAuth fails (unauthenticated)', async () => {
    mockGetOrgAuth.mockResolvedValueOnce(null)
    const { deleteContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await deleteContact('contact-1')
    expect(result).toEqual({ ok: false })
  })

  it('deletes contact by id and revalidates', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    authAll({ from: vi.fn().mockReturnValue({ delete: del }) })
    const { deleteContact } = await import('@/app/dashboard/marketing/contacts/actions')
    const result = await deleteContact('contact-1')
    expect(eq).toHaveBeenCalledWith('id', 'contact-1')
    expect(result).toEqual({ ok: true })
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
    mockRequireOrgAuth.mockRejectedValueOnce(new Error('Não autenticado'))
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await expect(createCampaign(fd({ list_id: LIST_ID }))).rejects.toThrow('Não autenticado')
  })

  it('throws when the list does not belong to the user (ownership check)', async () => {
    authAll({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }), // RLS hides foreign list
      }),
    })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await expect(createCampaign(fd({ list_id: LIST_ID, name: 'C', subject_template: 'S', body_template: 'B' }))).rejects.toThrow('Lista não encontrada')
  })

  it('creates the campaign and redirects when list is owned (no immediate dispatch)', async () => {
    const from = vi.fn().mockImplementation((table: string) => {
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
    authAll({ from })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await createCampaign(fd({
      list_id: LIST_ID, name: 'Campanha', subject_template: 'S', body_template: 'B',
      schedule_now: 'false',
    }))
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard/marketing/campaigns/camp-1')
    expect(mockPublishJSON).not.toHaveBeenCalled()
  })

  it('scopes the campaign insert to the list organization_id, not the caller-supplied one', async () => {
    let insertedPayload: Record<string, unknown> | undefined
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'marketing_lists') {
        return {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: LIST_ID, organization_id: 'org-owner-of-list' } }),
        }
      }
      return {
        insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          insertedPayload = payload
          return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null }) }) }
        }),
      }
    })
    authAll({ from })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await createCampaign(fd({
      list_id: LIST_ID, name: 'Campanha', subject_template: 'S', body_template: 'B',
      schedule_now: 'false',
    }))
    expect(insertedPayload?.organization_id).toBe('org-owner-of-list')
    expect(insertedPayload?.created_by).toBe('user-1')
  })

  it('throws when campaign insert fails', async () => {
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'marketing_lists') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: LIST_ID, organization_id: 'org-1' } }) }
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }) }),
        }),
      }
    })
    authAll({ from })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await expect(
      createCampaign(fd({ list_id: LIST_ID, name: 'Campanha', subject_template: 'S', body_template: 'B', schedule_now: 'false' }))
    ).rejects.toThrow('Erro ao criar campanha')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('dispatches sends immediately when schedule_now=true (admin client, QSTASH_TOKEN set)', async () => {
    process.env.QSTASH_TOKEN = 'qstash-test-token'
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'marketing_lists') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: LIST_ID, organization_id: 'org-1' } }) }
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null }) }),
        }),
      }
    })
    authAll({ from })

    const contactsSelect = { eq: vi.fn() }
    contactsSelect.eq.mockReturnValueOnce(contactsSelect) // .eq('list_id', ...)
    contactsSelect.eq.mockResolvedValueOnce({ data: [{ id: 'contact-1' }, { id: 'contact-2' }] }) // .eq('status', 'active')

    const sendsInsertSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'send-1', contact_id: 'contact-1' }, { id: 'send-2', contact_id: 'contact-2' }],
    })
    const updateEq = vi.fn().mockResolvedValue({ error: null })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'marketing_campaigns') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { list_id: LIST_ID, organization_id: 'org-1' } }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        }
      }
      if (table === 'marketing_contacts') {
        return { select: vi.fn().mockReturnValue(contactsSelect) }
      }
      if (table === 'marketing_sends') {
        return { insert: vi.fn().mockReturnValue({ select: sendsInsertSelect }) }
      }
      throw new Error(`unexpected admin table ${table}`)
    })

    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await createCampaign(fd({
      list_id: LIST_ID, name: 'Campanha', subject_template: 'S', body_template: 'B',
      schedule_now: 'true',
    }))

    expect(mockPublishJSON).toHaveBeenCalledTimes(2)
    expect(mockPublishJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ send_id: 'send-1', campaign_id: 'camp-1', contact_id: 'contact-1', sender_user_id: 'user-1' }),
      })
    )
    expect(updateEq).toHaveBeenCalledWith('id', 'camp-1')
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard/marketing/campaigns/camp-1')
    delete process.env.QSTASH_TOKEN
  })

  it('skips dispatch entirely when QSTASH_TOKEN is not configured', async () => {
    delete process.env.QSTASH_TOKEN
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'marketing_lists') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: LIST_ID, organization_id: 'org-1' } }) }
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null }) }),
        }),
      }
    })
    authAll({ from })
    const { createCampaign } = await import('@/app/dashboard/marketing/campaigns/new/actions')
    await createCampaign(fd({
      list_id: LIST_ID, name: 'Campanha', subject_template: 'S', body_template: 'B',
      schedule_now: 'true',
    }))
    expect(mockAdminFrom).not.toHaveBeenCalled()
    expect(mockPublishJSON).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard/marketing/campaigns/camp-1')
  })
})
