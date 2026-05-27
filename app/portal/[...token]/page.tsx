import { notFound } from 'next/navigation'
import { PortalClient } from './PortalClient'
import { getPortalData } from '@/lib/portal/data'

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string[] }>
}) {
  const { token } = await params
  const tokenStr = Array.isArray(token) ? token.join('/') : token

  const data = await getPortalData(tokenStr)
  if (!data) notFound()

  return (
    <PortalClient
      eventId={data.event.id}
      eventName={data.event.name}
      venueName={data.event.venue_name}
      eventDate={data.eventDateStr}
      status={data.event.status}
      initialItems={data.items}
      initialProgress={data.progress}
      portalToken={tokenStr}
      heroVideo={data.heroVideo}
      contentVideo={data.contentVideo}
      eventFiles={data.eventFiles}
      articles={data.articles}
    />
  )
}
