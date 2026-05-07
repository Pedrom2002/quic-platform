// Tipos Supabase — substituir por: npx supabase gen types typescript --local > types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          organization_id: string
          auth_user_id: string | null
          full_name: string
          email: string
          role: 'admin' | 'manager' | 'member'
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          auth_user_id?: string | null
          full_name: string
          email: string
          role?: 'admin' | 'manager' | 'member'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          auth_user_id?: string | null
          full_name?: string
          email?: string
          role?: 'admin' | 'manager' | 'member'
          avatar_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      event_types: {
        Row: {
          id: string
          organization_id: string
          name: string
          slug: string
          description: string | null
          color: string
          icon: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          slug: string
          description?: string | null
          color?: string
          icon?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string
          icon?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          id: string
          organization_id: string
          event_type_id: string
          name: string
          version: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_type_id: string
          name: string
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_type_id?: string
          name?: string
          version?: number
          is_active?: boolean
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checklist_template_items: {
        Row: {
          id: string
          template_id: string
          parent_item_id: string | null
          title: string
          description: string | null
          position: number
          is_client_visible: boolean
          client_label: string | null
          estimated_duration_h: number | null
          default_notification_rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          parent_item_id?: string | null
          title: string
          description?: string | null
          position: number
          is_client_visible?: boolean
          client_label?: string | null
          estimated_duration_h?: number | null
          default_notification_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          parent_item_id?: string | null
          title?: string
          description?: string | null
          position?: number
          is_client_visible?: boolean
          client_label?: string | null
          estimated_duration_h?: number | null
          default_notification_rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          id: string
          organization_id: string
          name: string
          channel: 'email' | 'whatsapp' | 'sms' | 'portal'
          language: string
          subject: string | null
          body_template: string
          whatsapp_template_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          channel: 'email' | 'whatsapp' | 'sms' | 'portal'
          language?: string
          subject?: string | null
          body_template: string
          whatsapp_template_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          channel?: 'email' | 'whatsapp' | 'sms' | 'portal'
          language?: string
          subject?: string | null
          body_template?: string
          whatsapp_template_id?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          organization_id: string
          event_type_id: string
          name: string
          slug: string
          description: string | null
          venue_name: string | null
          venue_address: string | null
          start_datetime: string
          end_datetime: string
          status: 'planning' | 'active' | 'completed' | 'cancelled'
          portal_token: string
          portal_token_expires_at: string | null
          settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_type_id: string
          name: string
          slug: string
          description?: string | null
          venue_name?: string | null
          venue_address?: string | null
          start_datetime: string
          end_datetime: string
          status?: 'planning' | 'active' | 'completed' | 'cancelled'
          portal_token?: string
          portal_token_expires_at?: string | null
          settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_type_id?: string
          name?: string
          slug?: string
          description?: string | null
          venue_name?: string | null
          venue_address?: string | null
          start_datetime?: string
          end_datetime?: string
          status?: 'planning' | 'active' | 'completed' | 'cancelled'
          portal_token?: string
          portal_token_expires_at?: string | null
          settings?: Json
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_team_assignments: {
        Row: {
          id: string
          event_id: string
          team_member_id: string
          role_in_event: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          team_member_id: string
          role_in_event?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          team_member_id?: string
          role_in_event?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          full_name: string
          email: string | null
          phone: string | null
          whatsapp: string | null
          company: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          company?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          company?: string | null
          notes?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      event_clients: {
        Row: {
          id: string
          event_id: string
          client_id: string
          role: 'primary_contact' | 'cc' | 'vip' | 'vendor'
          notification_prefs: Json
          opted_out: boolean
          opted_out_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          client_id: string
          role?: 'primary_contact' | 'cc' | 'vip' | 'vendor'
          notification_prefs?: Json
          opted_out?: boolean
          opted_out_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          client_id?: string
          role?: 'primary_contact' | 'cc' | 'vip' | 'vendor'
          notification_prefs?: Json
          opted_out?: boolean
          opted_out_at?: string | null
        }
        Relationships: []
      }
      event_checklist_items: {
        Row: {
          id: string
          event_id: string
          template_item_id: string | null
          parent_item_id: string | null
          title: string
          description: string | null
          client_label: string | null
          position: number
          is_client_visible: boolean
          status: 'pending' | 'in_progress' | 'completed' | 'skipped'
          assigned_to: string | null
          due_at: string | null
          started_at: string | null
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          notification_rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          template_item_id?: string | null
          parent_item_id?: string | null
          title: string
          description?: string | null
          client_label?: string | null
          position: number
          is_client_visible?: boolean
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          assigned_to?: string | null
          due_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          notification_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          template_item_id?: string | null
          parent_item_id?: string | null
          title?: string
          description?: string | null
          client_label?: string | null
          position?: number
          is_client_visible?: boolean
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          assigned_to?: string | null
          due_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          notification_rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      notification_jobs: {
        Row: {
          id: string
          event_id: string
          checklist_item_id: string | null
          client_id: string
          channel: 'email' | 'whatsapp' | 'sms' | 'portal'
          message_template_id: string | null
          rendered_subject: string | null
          rendered_body: string
          status: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          scheduled_at: string
          sent_at: string | null
          qstash_message_id: string | null
          attempt_count: number
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          checklist_item_id?: string | null
          client_id: string
          channel: 'email' | 'whatsapp' | 'sms' | 'portal'
          message_template_id?: string | null
          rendered_subject?: string | null
          rendered_body: string
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          scheduled_at?: string
          sent_at?: string | null
          qstash_message_id?: string | null
          attempt_count?: number
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          checklist_item_id?: string | null
          client_id?: string
          channel?: 'email' | 'whatsapp' | 'sms' | 'portal'
          message_template_id?: string | null
          rendered_subject?: string | null
          rendered_body?: string
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          scheduled_at?: string
          sent_at?: string | null
          qstash_message_id?: string | null
          attempt_count?: number
          last_error?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string
          notification_job_id: string
          event_at: string
          event_type: 'queued' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed'
          channel: string
          provider: string | null
          provider_message_id: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          notification_job_id: string
          event_at?: string
          event_type: 'queued' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed'
          channel: string
          provider?: string | null
          provider_message_id?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          notification_job_id?: string
          event_at?: string
          event_type?: 'queued' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed'
          channel?: string
          provider?: string | null
          provider_message_id?: string | null
          metadata?: Json
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          id: string
          source: 'resend' | 'twilio' | 'meta'
          event_type: string
          payload: Json
          processed: boolean
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source: 'resend' | 'twilio' | 'meta'
          event_type: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source?: 'resend' | 'twilio' | 'meta'
          event_type?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
        }
        Relationships: []
      }
      event_notes: {
        Row: {
          id: string
          event_id: string
          organization_id: string
          author_id: string | null
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          organization_id: string
          author_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          organization_id?: string
          author_id?: string | null
          content?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_files: {
        Row: {
          id: string
          event_id: string
          organization_id: string
          uploaded_by: string | null
          file_name: string
          file_size: number | null
          mime_type: string | null
          blob_url: string
          blob_pathname: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          organization_id: string
          uploaded_by?: string | null
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          blob_url: string
          blob_pathname: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          organization_id?: string
          uploaded_by?: string | null
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          blob_url?: string
          blob_pathname?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Aliases convenientes
export type Organization = Database['public']['Tables']['organizations']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type EventType = Database['public']['Tables']['event_types']['Row']
export type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row']
export type ChecklistTemplateItem = Database['public']['Tables']['checklist_template_items']['Row']
export type MessageTemplate = Database['public']['Tables']['message_templates']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EventTeamAssignment = Database['public']['Tables']['event_team_assignments']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type EventClient = Database['public']['Tables']['event_clients']['Row']
export type EventChecklistItem = Database['public']['Tables']['event_checklist_items']['Row']
export type NotificationJob = Database['public']['Tables']['notification_jobs']['Row']
export type NotificationLogEntry = Database['public']['Tables']['notification_log']['Row']
export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row']
export type EventNote = Database['public']['Tables']['event_notes']['Row']
export type EventFile = Database['public']['Tables']['event_files']['Row']
