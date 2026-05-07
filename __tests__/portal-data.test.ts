import { describe, it, expect } from 'vitest'
import { groupFilesByItem, filterEventLevelFiles } from '@/lib/portal/data'

describe('groupFilesByItem', () => {
  it('returns empty map for empty input', () => {
    const result = groupFilesByItem([])
    expect(result.size).toBe(0)
  })

  it('groups files by checklist_item_id', () => {
    const rows = [
      { checklist_item_id: 'item-1', event_file: { id: 'f1', file_name: 'a.pdf', file_size: 100, mime_type: 'application/pdf', blob_url: 'https://x/a.pdf' } },
      { checklist_item_id: 'item-1', event_file: { id: 'f2', file_name: 'b.pdf', file_size: 200, mime_type: 'application/pdf', blob_url: 'https://x/b.pdf' } },
      { checklist_item_id: 'item-2', event_file: { id: 'f3', file_name: 'c.pdf', file_size: 300, mime_type: 'application/pdf', blob_url: 'https://x/c.pdf' } },
    ]
    const result = groupFilesByItem(rows)
    expect(result.get('item-1')).toHaveLength(2)
    expect(result.get('item-2')).toHaveLength(1)
    expect(result.get('item-1')![0].id).toBe('f1')
  })

  it('handles items with single file', () => {
    const rows = [
      { checklist_item_id: 'item-a', event_file: { id: 'fx', file_name: 'x.jpg', file_size: null, mime_type: 'image/jpeg', blob_url: 'https://x/x.jpg' } },
    ]
    const result = groupFilesByItem(rows)
    expect(result.get('item-a')).toHaveLength(1)
    expect(result.get('item-a')![0].file_name).toBe('x.jpg')
  })
})

describe('filterEventLevelFiles', () => {
  const allFiles = [
    { id: 'f1', file_name: 'contract.pdf', file_size: 500, mime_type: 'application/pdf', blob_url: 'https://x/contract.pdf' },
    { id: 'f2', file_name: 'rider.pdf', file_size: 300, mime_type: 'application/pdf', blob_url: 'https://x/rider.pdf' },
    { id: 'f3', file_name: 'brief.docx', file_size: 100, mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', blob_url: 'https://x/brief.docx' },
  ]

  it('returns all files when none are linked to items', () => {
    const result = filterEventLevelFiles(allFiles, new Set())
    expect(result).toHaveLength(3)
  })

  it('excludes files linked to items', () => {
    const result = filterEventLevelFiles(allFiles, new Set(['f1', 'f3']))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('f2')
  })

  it('returns empty array when all files are linked', () => {
    const result = filterEventLevelFiles(allFiles, new Set(['f1', 'f2', 'f3']))
    expect(result).toHaveLength(0)
  })
})
