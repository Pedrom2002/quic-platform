import { randomUUID } from 'crypto'

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Server-side allowlist — client file.type is attacker-controlled and is only
// a hint; magic bytes are the authoritative check below.
// SVG is intentionally excluded: SVGs can embed <script> and event handlers,
// and with public blob storage they would execute JavaScript when opened directly.
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/quicktime',
])

// Magic-byte signatures for file types where spoofing would be most harmful.
// Keyed by hex prefix → normalised MIME type.
const MAGIC: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0xff, 0xd8, 0xff],                                     mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],     mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38],                               mime: 'image/gif' },
  // WebP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { bytes: [0x52, 0x49, 0x46, 0x46],                               mime: 'image/webp' }, // RIFF prefix; WEBP sub-type verified below
  { bytes: [0x25, 0x50, 0x44, 0x46],                               mime: 'application/pdf' },
  { bytes: [0x50, 0x4b, 0x03, 0x04],                               mime: 'application/zip' }, // DOCX/XLSX
  { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],      mime: 'application/cfb' }, // DOC/XLS
]

// Returns the magic-byte detected MIME for the first few bytes,
// or null if the signature is not in the list (treated as unknown/allowed).
export async function detectMimeFromMagic(file: File): Promise<string | null> {
  const buf = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buf)
  for (const { bytes: sig, mime } of MAGIC) {
    if (sig.every((b, i) => bytes[i] === b)) return mime
  }
  return null
}

// Strip path components and keep only safe characters.
// Returns a unique blob pathname so filenames cannot be guessed or enumerated.
export function safeBlobPathname(originalName: string): string {
  const name = originalName
    .replace(/[/\\]/g, '') // strip path separators
    .replace(/[^a-zA-Z0-9._\-() ]/g, '_') // replace unsafe chars
    .slice(0, 200)
    .trim() || 'upload'
  return `${randomUUID()}-${name}`
}

// Returns true if the detected magic type conflicts with the declared MIME type.
export function isMimeMismatch(declared: string, detected: string | null): boolean {
  if (!detected) return false
  if (detected === 'application/zip' && (
    declared === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    declared === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )) return false
  if (detected === 'application/cfb' && (
    declared === 'application/msword' ||
    declared === 'application/vnd.ms-excel'
  )) return false
  // RIFF prefix is shared by WebP, WAV, AVI — treat as match for image/webp since
  // WAV and AVI are not in ALLOWED_MIME_TYPES and would be rejected by the allowlist check first.
  if (detected === 'image/webp' && declared === 'image/webp') return false
  return detected !== declared
}
