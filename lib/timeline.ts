export interface ChecklistTimelineEvent {
  type: 'checklist'
  id: string
  item_title: string
  status: string
  member_name: string | null
  timestamp: string | null
}

export interface NotificationTimelineEvent {
  type: 'notification'
  id: string
  client_name: string
  channel: string
  status: string
  timestamp: string | null
}

export interface ClientTimelineEvent {
  type: 'client'
  id: string
  client_name: string
  action: 'added' | 'removed'
  role: string | null
  timestamp: string | null
}

export type TimelineEvent = ChecklistTimelineEvent | NotificationTimelineEvent | ClientTimelineEvent

export function mergeTimelineEvents(
  checklist: ChecklistTimelineEvent[],
  notifications: NotificationTimelineEvent[],
  clients: ClientTimelineEvent[],
): TimelineEvent[] {
  return [...checklist, ...notifications, ...clients]
    .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
    .slice(0, 30)
}
