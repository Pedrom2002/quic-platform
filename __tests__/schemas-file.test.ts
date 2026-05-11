import { describe, it, expect, vi } from 'vitest'
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  detectMimeFromMagic,
  safeBlobPathname,
  isMimeMismatch,
} from '@/schemas/file.schema'

// Mock crypto.randomUUID for deterministic pathname tests
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return { ...actual, randomUUID: vi.fn().mockReturnValue('00000000-0000-0000-0000-000000000000') }
})

describe('MAX_FILE_SIZE', () => {
  it('is 50MB', () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
  })
})

describe('ALLOWED_MIME_TYPES', () => {
  it('includes common image types', () => {
    expect(ALLOWED_MIME_TYPES.has('image/jpeg')).toBe(true)
    expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true)
  })

  it('includes pdf', () => {
    expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true)
  })

  it('does not include dangerous types', () => {
    expect(ALLOWED_MIME_TYPES.has('application/x-executable')).toBe(false)
    expect(ALLOWED_MIME_TYPES.has('text/html')).toBe(false)
  })
})

function makeFile(bytes: number[], type = 'application/octet-stream'): File {
  const buf = new Uint8Array(bytes)
  return new File([buf], 'test.bin', { type })
}

describe('detectMimeFromMagic', () => {
  it('detects JPEG from FF D8 FF magic bytes', async () => {
    const file = makeFile([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00])
    expect(await detectMimeFromMagic(file)).toBe('image/jpeg')
  })

  it('detects PNG from 89 50 4E 47 magic bytes', async () => {
    const file = makeFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(await detectMimeFromMagic(file)).toBe('image/png')
  })

  it('detects PDF from 25 50 44 46 magic bytes', async () => {
    const file = makeFile([0x25, 0x50, 0x44, 0x46, 0x00, 0x00, 0x00, 0x00])
    expect(await detectMimeFromMagic(file)).toBe('application/pdf')
  })

  it('detects GIF from 47 49 46 38 magic bytes', async () => {
    const file = makeFile([0x47, 0x49, 0x46, 0x38, 0x00, 0x00, 0x00, 0x00])
    expect(await detectMimeFromMagic(file)).toBe('image/gif')
  })

  it('detects ZIP (DOCX/XLSX container) from 50 4B 03 04', async () => {
    const file = makeFile([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00])
    expect(await detectMimeFromMagic(file)).toBe('application/zip')
  })

  it('detects CFB (DOC/XLS) from D0 CF 11 E0 magic bytes', async () => {
    const file = makeFile([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    expect(await detectMimeFromMagic(file)).toBe('application/cfb')
  })

  it('returns null for unknown magic bytes', async () => {
    const file = makeFile([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
    expect(await detectMimeFromMagic(file)).toBeNull()
  })

  it('returns null for empty file', async () => {
    const file = makeFile([])
    expect(await detectMimeFromMagic(file)).toBeNull()
  })
})

describe('safeBlobPathname', () => {
  it('strips forward slashes', () => {
    const result = safeBlobPathname('path/to/file.pdf')
    expect(result).not.toContain('/')
    expect(result).toContain('file.pdf')
  })

  it('strips backslashes', () => {
    const result = safeBlobPathname('path\\file.pdf')
    expect(result).not.toContain('\\')
  })

  it('replaces unsafe characters with underscore', () => {
    const result = safeBlobPathname('file<name>.pdf')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('truncates to 200 chars before UUID prefix', () => {
    const longName = 'A'.repeat(300)
    const result = safeBlobPathname(longName)
    // UUID prefix (36) + dash (1) + max 200 chars of name = max 237 total
    expect(result.length).toBeLessThanOrEqual(237)
  })

  it('uses "upload" as fallback when name becomes empty after sanitization', () => {
    // All chars stripped
    const result = safeBlobPathname('//\\\\')
    expect(result).toContain('upload')
  })

  it('prepends a UUID', () => {
    const result = safeBlobPathname('myfile.pdf')
    expect(result).toMatch(/^[0-9a-f-]{36}-/)
  })
})

describe('isMimeMismatch', () => {
  it('returns false when detected is null (no magic match)', () => {
    expect(isMimeMismatch('image/png', null)).toBe(false)
  })

  it('returns false when detected matches declared', () => {
    expect(isMimeMismatch('image/jpeg', 'image/jpeg')).toBe(false)
  })

  it('returns true when detected differs from declared', () => {
    expect(isMimeMismatch('image/png', 'image/jpeg')).toBe(true)
  })

  it('allows zip detected when declared is docx', () => {
    expect(isMimeMismatch(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip'
    )).toBe(false)
  })

  it('allows zip detected when declared is xlsx', () => {
    expect(isMimeMismatch(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip'
    )).toBe(false)
  })

  it('allows cfb detected when declared is doc', () => {
    expect(isMimeMismatch('application/msword', 'application/cfb')).toBe(false)
  })

  it('allows cfb detected when declared is xls', () => {
    expect(isMimeMismatch('application/vnd.ms-excel', 'application/cfb')).toBe(false)
  })

  it('returns true when zip detected but declared is not docx/xlsx', () => {
    expect(isMimeMismatch('image/png', 'application/zip')).toBe(true)
  })
})
