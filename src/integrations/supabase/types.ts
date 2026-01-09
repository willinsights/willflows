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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: string
          google_event_id: string | null
          id: string
          location: string | null
          outlook_event_id: string | null
          project_id: string | null
          start_at: string
          task_id: string | null
          title: string
          updated_at: string
          video_call_url: string | null
          workspace_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          outlook_event_id?: string | null
          project_id?: string | null
          start_at: string
          task_id?: string | null
          title: string
          updated_at?: string
          video_call_url?: string | null
          workspace_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          outlook_event_id?: string | null
          project_id?: string | null
          start_at?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          video_call_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          nif: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          tags: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[] | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          color: string
          created_at: string
          id: string
          is_final: boolean
          name: string
          phase: Database["public"]["Enums"]["kanban_phase"]
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          name: string
          phase: Database["public"]["Enums"]["kanban_phase"]
          position?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          name?: string
          phase?: Database["public"]["Enums"]["kanban_phase"]
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_iban: string | null
          bank_name: string | null
          client_id: string | null
          collaborator_id: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          freelancer_name: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          is_receivable: boolean
          paid_at: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          bank_iban?: string | null
          bank_name?: string | null
          client_id?: string | null
          collaborator_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          freelancer_name?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          is_receivable: boolean
          paid_at?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          bank_iban?: string | null
          bank_name?: string | null
          client_id?: string | null
          collaborator_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          freelancer_name?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          is_receivable?: boolean
          paid_at?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_media_links: {
        Row: {
          created_at: string
          id: string
          link_type: string
          project_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_type?: string
          project_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          link_type?: string
          project_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_media_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          created_at: string
          id: string
          payment_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phase: Database["public"]["Enums"]["kanban_phase"]
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phase: Database["public"]["Enums"]["kanban_phase"]
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phase?: Database["public"]["Enums"]["kanban_phase"]
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          checklist_templates: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          task_templates: Json
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          checklist_templates?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          task_templates?: Json
          type: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          checklist_templates?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          task_templates?: Json
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          agreed_value: number | null
          captacao_column_id: string | null
          category: Database["public"]["Enums"]["project_category"]
          city: string | null
          client_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_phase: Database["public"]["Enums"]["kanban_phase"]
          custo_captacao: number | null
          custo_edicao: number | null
          custom_category_id: string | null
          delivered_at: string | null
          delivery_date: string | null
          drive_folder_url: string | null
          dropbox_folder_url: string | null
          edicao_column_id: string | null
          estimated_costs: number | null
          frameio_project_id: string | null
          google_meet_url: string | null
          id: string
          internal_notes: string | null
          is_delivered: boolean
          item_type: string | null
          name: string
          notes: string | null
          payment_method: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          project_code: string | null
          region: string | null
          shoot_date: string | null
          shoot_end_time: string | null
          shoot_start_time: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          agreed_value?: number | null
          captacao_column_id?: string | null
          category?: Database["public"]["Enums"]["project_category"]
          city?: string | null
          client_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["kanban_phase"]
          custo_captacao?: number | null
          custo_edicao?: number | null
          custom_category_id?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          drive_folder_url?: string | null
          dropbox_folder_url?: string | null
          edicao_column_id?: string | null
          estimated_costs?: number | null
          frameio_project_id?: string | null
          google_meet_url?: string | null
          id?: string
          internal_notes?: string | null
          is_delivered?: boolean
          item_type?: string | null
          name: string
          notes?: string | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          project_code?: string | null
          region?: string | null
          shoot_date?: string | null
          shoot_end_time?: string | null
          shoot_start_time?: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string | null
          agreed_value?: number | null
          captacao_column_id?: string | null
          category?: Database["public"]["Enums"]["project_category"]
          city?: string | null
          client_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["kanban_phase"]
          custo_captacao?: number | null
          custo_edicao?: number | null
          custom_category_id?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          drive_folder_url?: string | null
          dropbox_folder_url?: string | null
          edicao_column_id?: string | null
          estimated_costs?: number | null
          frameio_project_id?: string | null
          google_meet_url?: string | null
          id?: string
          internal_notes?: string | null
          is_delivered?: boolean
          item_type?: string | null
          name?: string
          notes?: string | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          project_code?: string | null
          region?: string | null
          shoot_date?: string | null
          shoot_end_time?: string | null
          shoot_start_time?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_captacao_column_id_fkey"
            columns: ["captacao_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_custom_category_id_fkey"
            columns: ["custom_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_edicao_column_id_fkey"
            columns: ["edicao_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          assigned_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklists: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          is_completed: boolean
          position: number
          task_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          task_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          column_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_completed: boolean
          phase: Database["public"]["Enums"]["kanban_phase"]
          position: number
          priority: Database["public"]["Enums"]["priority_level"]
          project_id: string
          started_at: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          column_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_completed?: boolean
          phase: Database["public"]["Enums"]["kanban_phase"]
          position?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id: string
          started_at?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          column_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_completed?: boolean
          phase?: Database["public"]["Enums"]["kanban_phase"]
          position?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id?: string
          started_at?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          hourly_rate: number | null
          id: string
          invited_at: string
          is_active: boolean
          joined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          specialization: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number | null
          id?: string
          invited_at?: string
          is_active?: boolean
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specialization?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number | null
          id?: string
          invited_at?: string
          is_active?: boolean
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specialization?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          country: Database["public"]["Enums"]["country_region"]
          created_at: string
          currency: string
          id: string
          locale: string
          logo_url: string | null
          name: string
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_status: string
          timezone: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          country?: Database["public"]["Enums"]["country_region"]
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name: string
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          country?: Database["public"]["Enums"]["country_region"]
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name?: string
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_profile: { Args: { _profile_id: string }; Returns: boolean }
      create_workspace_with_admin: {
        Args: {
          p_country: Database["public"]["Enums"]["country_region"]
          p_currency: string
          p_locale: string
          p_name: string
          p_slug: string
          p_timezone: string
        }
        Returns: string
      }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_valid_invitation_token: {
        Args: { _token: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "captacao" | "freelancer" | "visualizador"
      country_region: "PT" | "BR"
      kanban_phase: "captacao" | "edicao"
      payment_status: "pendente" | "pago" | "vencido" | "cancelado"
      priority_level: "baixa" | "media" | "alta" | "urgente"
      project_category: "hotel" | "experiencia" | "evento" | "outro"
      project_type: "fotografia" | "video" | "foto_video"
      subscription_plan: "essencial" | "pro" | "studio"
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
  public: {
    Enums: {
      app_role: ["admin", "editor", "captacao", "freelancer", "visualizador"],
      country_region: ["PT", "BR"],
      kanban_phase: ["captacao", "edicao"],
      payment_status: ["pendente", "pago", "vencido", "cancelado"],
      priority_level: ["baixa", "media", "alta", "urgente"],
      project_category: ["hotel", "experiencia", "evento", "outro"],
      project_type: ["fotografia", "video", "foto_video"],
      subscription_plan: ["essencial", "pro", "studio"],
    },
  },
} as const
