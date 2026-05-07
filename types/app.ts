// Tipos de aplicação — DTOs, enums e tipos compostos

export type NotificationChannel = 'email' | 'whatsapp' | 'sms' | 'portal'
export type EventStatus = 'planning' | 'active' | 'completed' | 'cancelled'
export type ChecklistItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type TeamRole = 'admin' | 'manager' | 'member'
export type ClientRole = 'primary_contact' | 'cc' | 'vip' | 'vendor'

export interface NotificationRule {
  trigger: 'on_complete' | 'on_start' | 'scheduled' | 'manual'
  delay_minutes: number
  audience: 'all_clients' | 'specific_clients' | 'vip_only'
  channels: NotificationChannel[]
  message_template_id?: string
  language: 'pt' | 'en'
}

export interface NotificationPrefs {
  channels: NotificationChannel[]
  language: 'pt' | 'en'
}

// Supabase join shapes — Supabase returns related rows under the table name (plural)
export interface EventTypeJoin {
  name: string
  color: string
  icon: string
}

// event row returned by .select('*, event_types(name, color, icon)')
export interface EventWithTypeJoin {
  id: string
  name: string
  slug: string
  status: EventStatus
  start_datetime: string
  end_datetime: string
  venue_name: string | null
  venue_address: string | null
  description: string | null
  portal_token: string
  event_types: EventTypeJoin | null
}

// checklist_template row returned by .select('*, event_types(name, color), checklist_template_items(id)')
export interface TemplateWithJoins {
  id: string
  name: string
  version: number
  event_types: Pick<EventTypeJoin, 'name' | 'color'> | null
  checklist_template_items: { id: string }[]
}

// notification_job row returned by .select('..., clients(full_name), events(name)')
export interface NotificationJobWithJoins {
  id: string
  channel: string
  status: string
  sent_at: string | null
  rendered_subject: string | null
  clients: { full_name: string } | null
  events: { name: string } | null
}

// checklist_template_items row shape when joined via select('id, checklist_template_items(*)')
export interface ChecklistTemplateItem {
  id: string
  title: string
  client_label: string | null
  description: string | null
  position: number
  is_client_visible: boolean
  default_notification_rules: import('./database').Json
}

// Evento com joins (DTO legacy — kept for compatibility)
export interface EventWithType {
  id: string
  name: string
  slug: string
  status: EventStatus
  start_datetime: string
  end_datetime: string
  venue_name: string | null
  venue_address: string | null
  description: string | null
  portal_token: string
  event_type: {
    id: string
    name: string
    color: string
    icon: string
  }
  checklist_progress?: {
    total: number
    completed: number
    percent: number
  }
}

// Checklist item com informação do membro
export interface ChecklistItemWithMember {
  id: string
  event_id: string
  title: string
  client_label: string | null
  description: string | null
  position: number
  is_client_visible: boolean
  status: ChecklistItemStatus
  completed_at: string | null
  completion_note: string | null
  notification_rules: NotificationRule[]
  assigned_to: string | null
  assigned_member?: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

// Cliente com preferências de evento
export interface EventClientWithDetails {
  id: string
  event_id: string
  role: ClientRole
  notification_prefs: NotificationPrefs
  opted_out: boolean
  client: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    company: string | null
  }
}

// Payload do job de notificação enviado ao QStash
export interface NotificationJobPayload {
  job_id: string
  event_id: string
  client_id: string
  channel: NotificationChannel
  rendered_subject: string | null
  rendered_body: string
  client_email: string | null
  client_phone: string | null
  client_whatsapp: string | null
}

// Contexto do portal do cliente (token decoded)
export interface PortalTokenPayload {
  eventId: string
  iat: number
  exp: number
}

// Dados públicos para o portal do cliente
export interface PortalEventData {
  event: {
    id: string
    name: string
    venue_name: string | null
    start_datetime: string
    status: EventStatus
  }
  items: {
    id: string
    client_label: string
    status: ChecklistItemStatus
    completed_at: string | null
    completion_note: string | null
    position: number
  }[]
  progress: {
    total: number
    completed: number
    percent: number
  }
}

export interface EventTeamAssignmentWithMember {
  id: string
  event_id: string
  team_member_id: string
  role_in_event: string | null
  created_at: string
  team_member: {
    id: string
    full_name: string
    email: string
    role: string
    avatar_url: string | null
  }
}

export interface EventNoteWithAuthor {
  id: string
  event_id: string
  organization_id: string
  author_id: string | null
  content: string
  created_at: string
  updated_at: string
  author: { id: string; full_name: string; avatar_url: string | null } | null
}
