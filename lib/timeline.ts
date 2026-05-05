export interface ChecklistTimelineEvent {
  type: 'checklist'
  id: string
  item_title: string
  status: string
  member_name: string | null
  timestamp: string
}

export interface NotificationTimelineEvent {
  type: 'notification'
  id: string
  client_name: string
  channel: string
  status: string
  timestamp: string
}

export interface ClientTimelineEvent {
  type: 'client'
  id: string
  client_name: string
  action: 'added' | 'removed'
  role: string
  timestamp: string
}

export type TimelineEvent = ChecklistTimelineEvent | NotificationTimelineEvent | ClientTimelineEvent

export function mergeTimelineEvents(
  checklist: ChecklistTimelineEvent[],
  notifications: NotificationTimelineEvent[],
  clients: ClientTimelineEvent[],
): TimelineEvent[] {
  return [...checklist, ...notifications, ...clients]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30)
}
