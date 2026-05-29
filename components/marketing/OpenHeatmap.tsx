interface Props {
  opens: { opened_at: string }[]
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function OpenHeatmap({ opens }: Props) {
  // Build [day][hour] grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const o of opens) {
    if (!o.opened_at) continue
    const d = new Date(o.opened_at)
    grid[d.getDay()][d.getHours()]++
  }

  const max = Math.max(1, ...grid.flat())

  function shade(count: number): string {
    if (count === 0) return 'bg-zinc-100'
    const intensity = count / max
    if (intensity > 0.75) return 'bg-emerald-700'
    if (intensity > 0.5) return 'bg-emerald-500'
    if (intensity > 0.25) return 'bg-emerald-300'
    return 'bg-emerald-100'
  }

  if (opens.length === 0) return null

  return (
    <div className="mb-8 border rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-3">Horário de abertura</h2>
      <p className="text-xs text-zinc-500 mb-3">
        Quando os destinatários abrem os emails. Usa para otimizar a hora de envio.
      </p>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(24, 1fr)' }}>
          <div />
          {HOURS.map(h => (
            <div key={h} className="text-[10px] text-zinc-400 text-center">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
          {DAYS.map((day, dIdx) => (
            <>
              <div key={`label-${dIdx}`} className="text-[10px] text-zinc-500 pr-2 text-right">{day}</div>
              {HOURS.map(h => (
                <div
                  key={`${dIdx}-${h}`}
                  className={`aspect-square rounded-sm ${shade(grid[dIdx][h])}`}
                  title={`${day} ${h}h: ${grid[dIdx][h]} aberturas`}
                />
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}
