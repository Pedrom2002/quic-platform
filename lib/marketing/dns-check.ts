import { promises as dns } from 'node:dns'

export interface DnsCheckResult {
  domain: string
  spf: { found: boolean; value?: string; ok: boolean }
  dkim: { found: boolean; value?: string; ok: boolean }
  dmarc: { found: boolean; value?: string; policy?: string; ok: boolean }
}

export async function checkSenderDns(senderEmail: string): Promise<DnsCheckResult> {
  const domain = senderEmail.split('@')[1] ?? ''
  if (!domain) {
    return {
      domain: '',
      spf: { found: false, ok: false },
      dkim: { found: false, ok: false },
      dmarc: { found: false, ok: false },
    }
  }

  const [spf, dkim, dmarc] = await Promise.all([
    lookupTxt(domain).then(records => {
      const rec = records.find(r => r.startsWith('v=spf1'))
      return { found: !!rec, value: rec, ok: !!rec }
    }),
    lookupTxt(`default._domainkey.${domain}`).then(records => {
      const rec = records.find(r => r.startsWith('v=DKIM1'))
      return { found: !!rec, value: rec?.slice(0, 80) + '...', ok: !!rec }
    }),
    lookupTxt(`_dmarc.${domain}`).then(records => {
      const rec = records.find(r => r.startsWith('v=DMARC1'))
      const policy = rec?.match(/p=(\w+)/)?.[1]
      return {
        found: !!rec,
        value: rec,
        policy,
        ok: !!rec && policy !== 'none',
      }
    }),
  ])

  return { domain, spf, dkim, dmarc }
}

async function lookupTxt(host: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(host)
    return records.map(r => r.join(''))
  } catch {
    return []
  }
}
