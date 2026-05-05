import { describe, it, expect } from 'vitest'
import { mergeTimelineEvents } from '@/lib/timeline'

describe('mergeTimelineEvents', () => {
  it('merges and sorts by timestamp descending', () => {
    const checklist = [{
      type: 'checklist' as const,
      id: 'c1',
      item_title: 'Sonoplastia',
      status: 'completed',
      member_name: 'João',
      timestamp: '2026-05-05T10:00:00Z',
    }]
    const notifications = [{
      type: 'notification' as const,
      id: 'n1',
      client_name: 'Ana',
      channel: 'email',
      status: 'delivered',
      timestamp: '2026-05-05T11:00:00Z',
    }]
    const clients = [{
      type: 'client' as const,
      id: 'ec1',
      client_name: 'Carlos',
      action: 'added' as const,
      role: 'primary_contact',
      timestamp: '2026-05-05T09:00:00Z',
    }]
    const result = mergeTimelineEvents(checklist, notifications, clients)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('n1')
    expect(result[1].id).toBe('c1')
    expect(result[2].id).toBe('ec1')
  })

  it('limits to 30 events', () => {
    const checklist = Array.from({ length: 35 }, (_, i) => ({
      type: 'checklist' as const,
      id: `c${i}`,
      item_title: 'Item',
      status: 'completed',
      member_name: null,
      timestamp: `2026-05-05T${String(i).padStart(2, '0')}:00:00Z`,
    }))
    const result = mergeTimelineEvents(checklist, [], [])
    expect(result).toHaveLength(30)
  })
})
