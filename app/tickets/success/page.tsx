// app/tickets/success/page.tsx
import { SuccessPoller } from './SuccessPoller'

export default async function TicketsSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <p className="text-zinc-400 text-sm">Sessão de pagamento não encontrada.</p>
      </div>
    )
  }

  return <SuccessPoller sessionId={sessionId} />
}
