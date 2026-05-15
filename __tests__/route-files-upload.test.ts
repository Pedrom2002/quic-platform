/**
 * Tests for the JSON completion path in the files upload route.
 * Covers the MIME-type validation fix that prevents bypassing the
 * ALLOWED_MIME_TYPES allowlist (including the intentional SVG exclusion).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/blob', () => ({ put: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      ({ status: init?.status ?? 200, body: data, json: async () => data }),
  },
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const VALID_EVENT_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678'
const VALID_BLOB_URL = 'https://project.public.blob.vercel-storage.com/uuid-file.pdf'

function makeSupabase(eventExists = true) {
  const insertSingle = vi.fn().mockResolvedValue({ data: { id: 'f1', file_name: 'doc.pdf' }, error: null })
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'team_members') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'm1', organization_id: 'org-1' } }) }
      }
      if (table === 'events') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: eventExists ? { id: VALID_EVENT_ID } : null }) }
      }
      if (table === 'event_files') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          returns: vi.fn().mockReturnThis(),
          single: insertSingle,
        }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
    }),
  }
}

function makeJsonRequest(body: unknown) {
  return {
    headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
    json: () => Promise.resolve(body),
  }
}

describe('POST /api/events/[eventId]/files — JSON completion path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects disallowed MIME type (image/svg+xml) with 415', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)

    const { POST } = await import('@/app/api/events/[eventId]/files/route')
    const res = await POST(
      makeJsonRequest({
        blobUrl: VALID_BLOB_URL,
        blobPathname: 'uuid-exploit.svg',
        fileName: 'invoice.pdf',
        mimeType: 'image/svg+xml',
        fileSize: 1234,
      }) as never,
      { params: Promise.resolve({ eventId: VALID_EVENT_ID }) }
    )
    expect(res.status).toBe(415)
  })

  it('rejects empty mimeType with 415', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)

    const { POST } = await import('@/app/api/events/[eventId]/files/route')
    const res = await POST(
      makeJsonRequest({
        blobUrl: VALID_BLOB_URL,
        blobPathname: 'uuid-file',
        fileName: 'file',
        mimeType: '',
      }) as never,
      { params: Promise.resolve({ eventId: VALID_EVENT_ID }) }
    )
    expect(res.status).toBe(415)
  })

  it('rejects unknown MIME type with 415', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)

    const { POST } = await import('@/app/api/events/[eventId]/files/route')
    const res = await POST(
      makeJsonRequest({
        blobUrl: VALID_BLOB_URL,
        blobPathname: 'uuid-file.exe',
        fileName: 'malware.exe',
        mimeType: 'application/x-msdownload',
      }) as never,
      { params: Promise.resolve({ eventId: VALID_EVENT_ID }) }
    )
    expect(res.status).toBe(415)
  })

  it('rejects blobUrl from non-Vercel-Blob hostname with 400', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)

    const { POST } = await import('@/app/api/events/[eventId]/files/route')
    const res = await POST(
      makeJsonRequest({
        blobUrl: 'https://evil.com/file.pdf',
        blobPathname: 'file.pdf',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
      }) as never,
      { params: Promise.resolve({ eventId: VALID_EVENT_ID }) }
    )
    expect(res.status).toBe(400)
  })

  it('accepts a valid PDF via the JSON completion path', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)

    const { POST } = await import('@/app/api/events/[eventId]/files/route')
    const res = await POST(
      makeJsonRequest({
        blobUrl: VALID_BLOB_URL,
        blobPathname: 'uuid-doc.pdf',
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        fileSize: 50000,
      }) as never,
      { params: Promise.resolve({ eventId: VALID_EVENT_ID }) }
    )
    expect(res.status).toBe(201)
  })
})
