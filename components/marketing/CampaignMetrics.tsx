interface Props {
  total: number
  sent: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
}

export function CampaignMetrics({ total, sent, opened, clicked, bounced, unsubscribed }: Props) {
  const pct = (n: number) => sent > 0 ? `${Math.round(n / sent * 100)}%` : '—'

  const metrics = [
    { label: 'Enviados', value: sent, sub: `de ${total}` },
    { label: 'Abertos', value: opened, sub: pct(opened) },
    { label: 'Clicados', value: clicked, sub: pct(clicked) },
    { label: 'Bounced', value: bounced, sub: pct(bounced) },
    { label: 'Cancelados', value: unsubscribed, sub: pct(unsubscribed) },
  ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
      {metrics.map(m => (
        <div key={m.label} className="border rounded-lg p-4">
          <p className="text-2xl font-semibold">{m.value}</p>
          <p className="text-sm font-medium mt-1">{m.label}</p>
          <p className="text-xs text-zinc-500">{m.sub}</p>
        </div>
      ))}
    </div>
  )
}
