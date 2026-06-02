export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      checklist_item_files: {
        Row: {
          checklist_item_id: string
          created_at: string | null
          event_file_id: string
          id: string
          linked_by: string | null
          organization_id: string
        }
        Insert: {
          checklist_item_id: string
          created_at?: string | null
          event_file_id: string
          id?: string
          linked_by?: string | null
          organization_id: string
        }
        Update: {
          checklist_item_id?: string
          created_at?: string | null
          event_file_id?: string
          id?: string
          linked_by?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_files_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "event_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_files_event_file_id_fkey"
            columns: ["event_file_id"]
            isOneToOne: false
            referencedRelation: "event_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_files_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_item_notes: {
        Row: {
          author_id: string | null
          checklist_item_id: string
          content: string
          created_at: string | null
          event_id: string
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          checklist_item_id: string
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          checklist_item_id?: string
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_notes_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "event_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          category: string | null
          client_label: string | null
          created_at: string | null
          default_notification_rules: Json | null
          description: string | null
          estimated_duration_h: number | null
          id: string
          is_client_visible: boolean | null
          parent_item_id: string | null
          position: number
          template_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          client_label?: string | null
          created_at?: string | null
          default_notification_rules?: Json | null
          description?: string | null
          estimated_duration_h?: number | null
          id?: string
          is_client_visible?: boolean | null
          parent_item_id?: string | null
          position: number
          template_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          client_label?: string | null
          created_at?: string | null
          default_notification_rules?: Json | null
          description?: string | null
          estimated_duration_h?: number | null
          id?: string
          is_client_visible?: boolean | null
          parent_item_id?: string | null
          position?: number
          template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_type_id: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_type_id: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_type_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_group_members: {
        Row: {
          contact_id: string
          created_at: string | null
          group_id: string
          id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          group_id: string
          id?: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          admin_only: boolean
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          admin_only?: boolean
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          admin_only?: boolean
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_articles: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          organization_id: string
          source: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          organization_id: string
          source?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          source?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_articles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          client_label: string | null
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          event_id: string
          id: string
          is_client_visible: boolean | null
          notification_rules: Json | null
          parent_item_id: string | null
          position: number
          started_at: string | null
          status: string
          template_item_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          client_label?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          event_id: string
          id?: string
          is_client_visible?: boolean | null
          notification_rules?: Json | null
          parent_item_id?: string | null
          position: number
          started_at?: string | null
          status?: string
          template_item_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          client_label?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          event_id?: string
          id?: string
          is_client_visible?: boolean | null
          notification_rules?: Json | null
          parent_item_id?: string | null
          position?: number
          started_at?: string | null
          status?: string
          template_item_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "event_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      event_clients: {
        Row: {
          client_id: string
          created_at: string | null
          event_id: string
          id: string
          notification_prefs: Json | null
          opted_out: boolean | null
          opted_out_at: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          event_id: string
          id?: string
          notification_prefs?: Json | null
          opted_out?: boolean | null
          opted_out_at?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          notification_prefs?: Json | null
          opted_out?: boolean | null
          opted_out_at?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_clients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_files: {
        Row: {
          blob_pathname: string
          blob_url: string
          created_at: string | null
          event_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          blob_pathname: string
          blob_url: string
          created_at?: string | null
          event_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          blob_pathname?: string
          blob_url?: string
          created_at?: string | null
          event_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          event_id: string
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_raffle_entries: {
        Row: {
          created_at: string | null
          drawn_at: string | null
          id: string
          is_winner: boolean
          organization_id: string
          participant_name: string
          raffle_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          drawn_at?: string | null
          id?: string
          is_winner?: boolean
          organization_id: string
          participant_name: string
          raffle_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          drawn_at?: string | null
          id?: string
          is_winner?: boolean
          organization_id?: string
          participant_name?: string
          raffle_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_raffle_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_raffle_entries_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "event_raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_raffles: {
        Row: {
          created_at: string | null
          description: string | null
          drawn_at: string | null
          event_id: string
          id: string
          organization_id: string
          prize: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          drawn_at?: string | null
          event_id: string
          id?: string
          organization_id: string
          prize?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          drawn_at?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          prize?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_raffles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_raffles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reports: {
        Row: {
          blob_pathname: string | null
          blob_url: string
          created_at: string
          event_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          title: string
          type: Database["public"]["Enums"]["report_type"]
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          blob_pathname?: string | null
          blob_url: string
          created_at?: string
          event_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          title: string
          type: Database["public"]["Enums"]["report_type"]
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          blob_pathname?: string | null
          blob_url?: string
          created_at?: string
          event_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          title?: string
          type?: Database["public"]["Enums"]["report_type"]
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_task_files: {
        Row: {
          created_at: string | null
          event_file_id: string
          id: string
          linked_by: string | null
          organization_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          event_file_id: string
          id?: string
          linked_by?: string | null
          organization_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          event_file_id?: string
          id?: string
          linked_by?: string | null
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_task_files_event_file_id_fkey"
            columns: ["event_file_id"]
            isOneToOne: false
            referencedRelation: "event_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_task_files_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_task_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "event_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_task_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          event_id: string
          id: string
          organization_id: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          organization_id: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_task_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_task_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_task_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "event_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tasks: {
        Row: {
          assigned_to: string | null
          checklist_item_id: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          event_id: string
          id: string
          organization_id: string
          parent_id: string | null
          position: number
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          checklist_item_id?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          event_id: string
          id?: string
          organization_id: string
          parent_id?: string | null
          position?: number
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          checklist_item_id?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          parent_id?: string | null
          position?: number
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "event_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "event_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_assignments: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          role_in_event: string | null
          team_member_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          role_in_event?: string | null
          team_member_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          role_in_event?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_team_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_datetime: string
          event_type_id: string
          id: string
          name: string
          organization_id: string
          portal_token: string
          portal_token_expires_at: string | null
          portal_token_revoked_at: string | null
          settings: Json | null
          slug: string
          start_datetime: string
          status: string
          updated_at: string | null
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_datetime: string
          event_type_id: string
          id?: string
          name: string
          organization_id: string
          portal_token?: string
          portal_token_expires_at?: string | null
          portal_token_revoked_at?: string | null
          settings?: Json | null
          slug: string
          start_datetime: string
          status?: string
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_datetime?: string
          event_type_id?: string
          id?: string
          name?: string
          organization_id?: string
          portal_token?: string
          portal_token_expires_at?: string | null
          portal_token_revoked_at?: string | null
          settings?: Json | null
          slug?: string
          start_datetime?: string
          status?: string
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          ai_objective: string | null
          ai_personalize: boolean
          body_template: string
          created_at: string
          created_by: string
          followup_body: string | null
          followup_days: number
          followup_enabled: boolean
          followup_max: number
          followup_subject: string | null
          id: string
          list_id: string
          name: string
          organization_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["marketing_campaign_status"]
          subject_template: string
        }
        Insert: {
          ai_objective?: string | null
          ai_personalize?: boolean
          body_template: string
          created_at?: string
          created_by: string
          followup_body?: string | null
          followup_days?: number
          followup_enabled?: boolean
          followup_max?: number
          followup_subject?: string | null
          id?: string
          list_id: string
          name: string
          organization_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["marketing_campaign_status"]
          subject_template: string
        }
        Update: {
          ai_objective?: string | null
          ai_personalize?: boolean
          body_template?: string
          created_at?: string
          created_by?: string
          followup_body?: string | null
          followup_days?: number
          followup_enabled?: boolean
          followup_max?: number
          followup_subject?: string | null
          id?: string
          list_id?: string
          name?: string
          organization_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["marketing_campaign_status"]
          subject_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "marketing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          engagement_score: number
          id: string
          list_id: string
          name: string | null
          organization_id: string
          role: string | null
          status: Database["public"]["Enums"]["marketing_contact_status"]
          tags: string[]
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          engagement_score?: number
          id?: string
          list_id: string
          name?: string | null
          organization_id: string
          role?: string | null
          status?: Database["public"]["Enums"]["marketing_contact_status"]
          tags?: string[]
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          engagement_score?: number
          id?: string
          list_id?: string
          name?: string | null
          organization_id?: string
          role?: string | null
          status?: Database["public"]["Enums"]["marketing_contact_status"]
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "marketing_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "marketing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_lists: {
        Row: {
          contact_count: number
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          contact_count?: number
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          contact_count?: number
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sender_warmup: {
        Row: {
          daily_sent: number
          first_send_at: string
          last_send_at: string | null
          total_sent: number
          user_id: string
        }
        Insert: {
          daily_sent?: number
          first_send_at?: string
          last_send_at?: string | null
          total_sent?: number
          user_id: string
        }
        Update: {
          daily_sent?: number
          first_send_at?: string
          last_send_at?: string | null
          total_sent?: number
          user_id?: string
        }
        Relationships: []
      }
      marketing_sends: {
        Row: {
          body_rendered: string | null
          bot_suspected: boolean
          campaign_id: string
          clicked_at: string | null
          contact_id: string
          error: string | null
          followup_count: number
          id: string
          last_followup_at: string | null
          message_id: string | null
          opened_at: string | null
          organization_id: string
          pixel_bottom_at: string | null
          pixel_top_at: string | null
          replied_at: string | null
          reply_snippet: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["marketing_send_status"]
          subject_rendered: string | null
        }
        Insert: {
          body_rendered?: string | null
          bot_suspected?: boolean
          campaign_id: string
          clicked_at?: string | null
          contact_id: string
          error?: string | null
          followup_count?: number
          id?: string
          last_followup_at?: string | null
          message_id?: string | null
          opened_at?: string | null
          organization_id: string
          pixel_bottom_at?: string | null
          pixel_top_at?: string | null
          replied_at?: string | null
          reply_snippet?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_send_status"]
          subject_rendered?: string | null
        }
        Update: {
          body_rendered?: string | null
          bot_suspected?: boolean
          campaign_id?: string
          clicked_at?: string | null
          contact_id?: string
          error?: string | null
          followup_count?: number
          id?: string
          last_followup_at?: string | null
          message_id?: string | null
          opened_at?: string | null
          organization_id?: string
          pixel_bottom_at?: string | null
          pixel_top_at?: string | null
          replied_at?: string | null
          reply_snippet?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_send_status"]
          subject_rendered?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "marketing_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string
          name: string
          organization_id: string
          subject: string | null
          template_key: string
          updated_at: string | null
          whatsapp_template_id: string | null
        }
        Insert: {
          body_template: string
          channel: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          name: string
          organization_id: string
          subject?: string | null
          template_key?: string
          updated_at?: string | null
          whatsapp_template_id?: string | null
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          name?: string
          organization_id?: string
          subject?: string | null
          template_key?: string
          updated_at?: string | null
          whatsapp_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          attempt_count: number | null
          channel: string
          checklist_item_id: string | null
          client_id: string
          created_at: string | null
          event_article_id: string | null
          event_id: string
          id: string
          last_error: string | null
          message_template_id: string | null
          qstash_message_id: string | null
          rendered_body: string
          rendered_subject: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          channel: string
          checklist_item_id?: string | null
          client_id: string
          created_at?: string | null
          event_article_id?: string | null
          event_id: string
          id?: string
          last_error?: string | null
          message_template_id?: string | null
          qstash_message_id?: string | null
          rendered_body: string
          rendered_subject?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          channel?: string
          checklist_item_id?: string | null
          client_id?: string
          created_at?: string | null
          event_article_id?: string | null
          event_id?: string
          id?: string
          last_error?: string | null
          message_template_id?: string | null
          qstash_message_id?: string | null
          rendered_body?: string
          rendered_subject?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "event_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_event_article_id_fkey"
            columns: ["event_article_id"]
            isOneToOne: false
            referencedRelation: "event_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_message_template_id_fkey"
            columns: ["message_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: string
          event_at: string
          event_type: string
          id: string
          metadata: Json | null
          notification_job_id: string
          provider: string | null
          provider_message_id: string | null
        }
        Insert: {
          channel: string
          event_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notification_job_id: string
          provider?: string | null
          provider_message_id?: string | null
        }
        Update: {
          channel?: string
          event_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_job_id?: string
          provider?: string | null
          provider_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_notification_job_id_fkey"
            columns: ["notification_job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          organization_id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_smtp_credentials: {
        Row: {
          created_at: string
          from_name: string
          host: string
          id: string
          password_enc: string
          port: number
          user_id: string
          username: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          from_name: string
          host: string
          id?: string
          password_enc: string
          port?: number
          user_id: string
          username: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          from_name?: string
          host?: string
          id?: string
          password_enc?: string
          port?: number
          user_id?: string
          username?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          source: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          source: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_notification_jobs: {
        Args: { p_batch_size: number }
        Returns: {
          channel: string
          client_id: string
          event_id: string
          id: string
          rendered_body: string
          rendered_subject: string
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      marketing_check_warmup_limit: {
        Args: { p_user_id: string }
        Returns: Json
      }
      marketing_increment_score: {
        Args: { p_contact_id: string; p_delta: number }
        Returns: undefined
      }
      marketing_record_send: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      marketing_campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "paused"
      marketing_contact_status: "active" | "unsubscribed" | "bounced"
      marketing_send_status:
        | "pending"
        | "sent"
        | "opened"
        | "clicked"
        | "bounced"
        | "unsubscribed"
        | "failed"
        | "replied"
      report_type: "technical" | "contract"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      marketing_campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "paused",
      ],
      marketing_contact_status: ["active", "unsubscribed", "bounced"],
      marketing_send_status: [
        "pending",
        "sent",
        "opened",
        "clicked",
        "bounced",
        "unsubscribed",
        "failed",
        "replied",
      ],
      report_type: ["technical", "contract"],
    },
  },
} as const

export type ReportType = 'technical' | 'contract'
export type EventReport = Database['public']['Tables']['event_reports']['Row']
export type EventArticle = Database['public']['Tables']['event_articles']['Row']

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
export type ChecklistItemNoteRow = Database['public']['Tables']['checklist_item_notes']['Row']
export type ChecklistItemFileLinkRow = Database['public']['Tables']['checklist_item_files']['Row']
export type EventTaskRow = Database['public']['Tables']['event_tasks']['Row']
export type EventTaskNoteRow = Database['public']['Tables']['event_task_notes']['Row']
export type EventTaskFileRow = Database['public']['Tables']['event_task_files']['Row']
