export interface PortalItemFile {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  blob_url: string
}

export interface PortalArticle {
  id: string
  title: string
  url: string
  source: string | null
  created_at: string
}

export interface PortalReport {
  id: string
  title: string
  type: 'technical' | 'contract'
  file_name: string
  file_size: number | null
  mime_type: string | null
  blob_url: string
  created_at: string
}

export interface PortalItem {
  id: string
  client_label: string | null
  title: string
  status: string
  completed_at: string | null
  completion_note: string | null
  position: number
  due_at: string | null
  category: string | null
  files: PortalItemFile[]
}

export interface PortalProgress {
  total: number
  completed: number
  percent: number
}

export interface PortalEvent {
  id: string
  name: string
  venue_name: string | null
  start_datetime: string
  status: string
}

export interface PortalData {
  event: PortalEvent
  items: PortalItem[]
  progress: PortalProgress
  articles: PortalArticle[]
  reports: PortalReport[]
  eventFiles: PortalItemFile[]
}

export async function fetchPortalData(appBaseUrl: string, token: string): Promise<PortalData | null> {
  try {
    const response = await fetch(`${appBaseUrl}/api/portal/${token}`)
    if (!response.ok) return null
    const body = await response.json()
    return body as PortalData
  } catch {
    return null
  }
}
