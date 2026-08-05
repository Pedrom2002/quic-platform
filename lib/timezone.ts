// Converte um valor de <input type="datetime-local"> (string sem offset,
// ex. "2026-08-04T14:00", sempre em hora de Lisboa neste produto) para o
// instante UTC correto, tendo em conta WET/WEST (DST).
//
// `new Date(datetimeLocalString).toISOString()` assume o timezone do
// PROCESSO que corre o código (UTC em produção/Vercel), não a hora de
// Lisboa que o utilizador introduziu — produz um erro de offset (0h em WET,
// 1h em WEST) sempre que usado numa Server Action. Este helper usa
// Intl.DateTimeFormat com timeZone explícito para calcular o offset real de
// Lisboa nessa data específica, sem depender de bibliotecas extra.
export function lisbonDatetimeLocalToUTC(datetimeLocal: string): string {
  const [datePart, timePart] = datetimeLocal.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart ?? '00:00').split(':').map(Number)

  // Ponto de partida: trata os componentes como se fossem UTC, para termos
  // um instante válido a passar ao formatter.
  const asUtc = Date.UTC(year, month - 1, day, hour, minute)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Lisbon',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(asUtc))

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const lisbonAsUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour'), get('minute'), get('second')
  )

  // Diferença entre "o que o formatter mostrou em Lisboa" e "o instante UTC
  // que lhe demos" = offset de Lisboa nesse instante. Subtraído do ponto de
  // partida, dá o instante UTC correto para os componentes originais.
  const offsetMs = lisbonAsUtc - asUtc
  return new Date(asUtc - offsetMs).toISOString()
}
