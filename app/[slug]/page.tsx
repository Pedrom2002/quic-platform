import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildVcard(name: string, role: string, email: string, cardUrl: string) {
  const parts = name.split(' ')
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${name}`,
    'ORG:Quic',
    `TITLE:${role}`,
    `EMAIL:${email}`,
    `URL:${cardUrl}`,
    'END:VCARD',
  ]
  return lines.join('\r\n') + '\r\n'
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Membro',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: members } = await supabase
    .from('team_members')
    .select('full_name, role')
    .eq('is_active', true)

  const member = (members ?? []).find(m => toSlug(m.full_name) === slug)
  if (!member) return { title: 'Quic' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.quic.pt'
  return {
    title: `${member.full_name} · Quic`,
    description: `${roleLabels[member.role] ?? member.role} na Quic`,
    openGraph: {
      title: `${member.full_name} · Quic`,
      description: `${roleLabels[member.role] ?? member.role} na Quic`,
      url: `${appUrl}/${slug}`,
      siteName: 'Quic',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${member.full_name} · Quic`,
      description: `${roleLabels[member.role] ?? member.role} na Quic`,
    },
  }
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: members } = await supabase
    .from('team_members')
    .select('id, full_name, email, role')
    .eq('is_active', true)

  const member = (members ?? []).find(m => toSlug(m.full_name) === slug)
  if (!member) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.quic.pt'
  const cardUrl = `${appUrl}/${slug}`
  const vcard = buildVcard(member.full_name, roleLabels[member.role] ?? member.role, member.email, cardUrl)
  const vcfData = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(cardUrl)}`

  return (
    <div className="min-h-screen bg-[#0d0c0d] flex items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div style={{ width: 48, height: 2, background: '#fff', marginBottom: 36 }} />

        <div style={{ marginBottom: 28 }}>
          <Image src="/logo-branco.png" alt="Quic" width={160} height={64} style={{ height: 64, width: 'auto' }} priority />
        </div>

        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">{member.full_name}</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1.5">{roleLabels[member.role] ?? member.role}</p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e', width: '100%', margin: '28px 0' }} />

        <ul style={{ listStyle: 'none', width: '100%', padding: 0, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>
            <a
              href={`mailto:${member.email}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#0d0c0d', border: '1px solid #1e1e1e', borderRadius: 12,
                padding: '13px 16px', textDecoration: 'none',
              }}
            >
              <span style={{ width: 36, height: 36, background: '#1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#888', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Email</span>
                <span style={{ fontSize: 13, color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</span>
              </div>
            </a>
          </li>
        </ul>

        <a
          href={vcfData}
          download={`${member.full_name.replace(/\s+/g, '-').toLowerCase()}.vcf`}
          style={{
            width: '100%', background: '#fff', color: '#0d0c0d',
            padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            textDecoration: 'none', textAlign: 'center', display: 'block', marginBottom: 32,
          }}
        >
          Guardar Contacto
        </a>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Partilhar este cartão
          </p>
          <div style={{ background: '#fff', borderRadius: 12, padding: 10, display: 'inline-flex' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt={`QR code para ${member.full_name}`} width={160} height={160} style={{ display: 'block', borderRadius: 4 }} />
          </div>
        </div>

        <div style={{ width: 48, height: 2, background: '#1e1e1e', marginTop: 36 }} />
      </div>
    </div>
  )
}
