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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id: string
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_invite_tokens: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          notes: string | null
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      beta_waitlist: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          invite_token_id: string | null
          invited_at: string | null
          name: string | null
          notes: string | null
          source: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          invite_token_id?: string | null
          invited_at?: string | null
          name?: string | null
          notes?: string | null
          source?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invite_token_id?: string | null
          invited_at?: string | null
          name?: string | null
          notes?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_waitlist_invite_token_id_fkey"
            columns: ["invite_token_id"]
            isOneToOne: false
            referencedRelation: "beta_invite_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_auto_settings: {
        Row: {
          articles_per_day: number | null
          auto_publish: boolean | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          preferred_categories: string[] | null
          preferred_topics: string[] | null
          schedule_hour: number | null
          schedule_minute: number | null
          updated_at: string | null
        }
        Insert: {
          articles_per_day?: number | null
          auto_publish?: boolean | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          preferred_categories?: string[] | null
          preferred_topics?: string[] | null
          schedule_hour?: number | null
          schedule_minute?: number | null
          updated_at?: string | null
        }
        Update: {
          articles_per_day?: number | null
          auto_publish?: boolean | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          preferred_categories?: string[] | null
          preferred_topics?: string[] | null
          schedule_hour?: number | null
          schedule_minute?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string
          category: string | null
          content: string
          cover_image: string | null
          cover_image_credit: string | null
          cover_image_source: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_name: string
          category?: string | null
          content: string
          cover_image?: string | null
          cover_image_credit?: string | null
          cover_image_source?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_name?: string
          category?: string | null
          content?: string
          cover_image?: string | null
          cover_image_credit?: string | null
          cover_image_source?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_share_analytics: {
        Row: {
          id: string
          platform: string
          post_id: string
          referrer: string | null
          shared_at: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          platform: string
          post_id: string
          referrer?: string | null
          shared_at?: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          platform?: string
          post_id?: string
          referrer?: string | null
          shared_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_share_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          referrer: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
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
          is_private: boolean
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
          is_private?: boolean
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
          is_private?: boolean
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
      client_communications: {
        Row: {
          client_id: string
          contact_date: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          meet_url: string | null
          subject: string
          type: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          contact_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          meet_url?: string | null
          subject: string
          type?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          contact_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          meet_url?: string | null
          subject?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_workspace_id_fkey"
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
          converted_at: string | null
          country: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          id: string
          is_active: boolean
          last_contact_at: string | null
          lead_source: string | null
          lead_status: Database["public"]["Enums"]["lead_status"] | null
          lost_reason: string | null
          name: string
          next_follow_up: string | null
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
          converted_at?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          is_active?: boolean
          last_contact_at?: string | null
          lead_source?: string | null
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          lost_reason?: string | null
          name: string
          next_follow_up?: string | null
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
          converted_at?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          is_active?: boolean
          last_contact_at?: string | null
          lead_source?: string | null
          lead_status?: Database["public"]["Enums"]["lead_status"] | null
          lost_reason?: string | null
          name?: string
          next_follow_up?: string | null
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
      contract_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          placeholders: Json | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          placeholders?: Json | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          placeholders?: Json | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_views: {
        Row: {
          contract_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          contract_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          contract_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_views_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string
          client_signature_data: string | null
          client_signed_ip: string | null
          client_signed_name: string | null
          client_signed_user_agent: string | null
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          payment_terms: string | null
          project_id: string | null
          sent_at: string | null
          signature_token: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["contract_status"]
          template_id: string | null
          title: string
          total_value: number | null
          updated_at: string | null
          viewed_at: string | null
          workspace_id: string
        }
        Insert: {
          client_id: string
          client_signature_data?: string | null
          client_signed_ip?: string | null
          client_signed_name?: string | null
          client_signed_user_agent?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          payment_terms?: string | null
          project_id?: string | null
          sent_at?: string | null
          signature_token?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          title: string
          total_value?: number | null
          updated_at?: string | null
          viewed_at?: string | null
          workspace_id: string
        }
        Update: {
          client_id?: string
          client_signature_data?: string | null
          client_signed_ip?: string | null
          client_signed_name?: string | null
          client_signed_user_agent?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          payment_terms?: string | null
          project_id?: string | null
          sent_at?: string | null
          signature_token?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          title?: string
          total_value?: number | null
          updated_at?: string | null
          viewed_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_active: boolean | null
          is_muted: boolean | null
          is_pinned: boolean | null
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_active?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_active?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_archived: boolean | null
          is_private: boolean | null
          name: string | null
          project_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          is_private?: boolean | null
          name?: string | null
          project_id?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          is_private?: boolean | null
          name?: string | null
          project_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
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
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          file_url: string | null
          filters: Json | null
          format: string
          id: string
          report_type: string
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_url?: string | null
          filters?: Json | null
          format: string
          id?: string
          report_type: string
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_url?: string | null
          filters?: Json | null
          format?: string
          id?: string
          report_type?: string
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          id: string
          page_url: string | null
          priority: string | null
          screenshot_url: string | null
          status: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description: string
          id?: string
          page_url?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          id?: string
          page_url?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          assigned_to: string
          created_at: string | null
          created_by: string
          done_at: string | null
          due_at: string | null
          id: string
          message_id: string
          note: string | null
          status: Database["public"]["Enums"]["followup_status"] | null
          workspace_id: string
        }
        Insert: {
          assigned_to: string
          created_at?: string | null
          created_by: string
          done_at?: string | null
          due_at?: string | null
          id?: string
          message_id: string
          note?: string | null
          status?: Database["public"]["Enums"]["followup_status"] | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string
          created_at?: string | null
          created_by?: string
          done_at?: string | null
          due_at?: string | null
          id?: string
          message_id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["followup_status"] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          access_token: string | null
          access_token_encrypted: string | null
          calendar_id: string | null
          created_at: string
          id: string
          import_from_google: boolean | null
          is_connected: boolean | null
          last_sync_at: string | null
          refresh_token: string | null
          refresh_token_encrypted: string | null
          sync_deliveries: boolean | null
          sync_error: string | null
          sync_events: boolean | null
          sync_meetings: boolean | null
          sync_shoots: boolean | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_encrypted?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          import_from_google?: boolean | null
          is_connected?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          refresh_token_encrypted?: string | null
          sync_deliveries?: boolean | null
          sync_error?: string | null
          sync_events?: boolean | null
          sync_meetings?: boolean | null
          sync_shoots?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          access_token_encrypted?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          import_from_google?: boolean | null
          is_connected?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          refresh_token_encrypted?: string | null
          sync_deliveries?: boolean | null
          sync_error?: string | null
          sync_events?: boolean | null
          sync_meetings?: boolean | null
          sync_shoots?: boolean | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_sync_log: {
        Row: {
          connection_id: string
          entity_id: string
          entity_type: string
          google_event_id: string
          id: string
          last_synced_at: string
          sync_direction: string
        }
        Insert: {
          connection_id: string
          entity_id: string
          entity_type: string
          google_event_id: string
          id?: string
          last_synced_at?: string
          sync_direction?: string
        }
        Update: {
          connection_id?: string
          entity_id?: string
          entity_type?: string
          google_event_id?: string
          id?: string
          last_synced_at?: string
          sync_direction?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_connections"
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
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          message_id: string
          mime_type: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          message_id: string
          mime_type?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          message_id?: string
          mime_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          created_at: string | null
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_task_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          message_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_task_links_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          body_tsv: unknown
          conversation_id: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          metadata: Json | null
          parent_message_id: string | null
          type: Database["public"]["Enums"]["message_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          body_tsv?: unknown
          conversation_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          metadata?: Json | null
          parent_message_id?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          body_tsv?: unknown
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          metadata?: Json | null
          parent_message_id?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
      page_views: {
        Row: {
          created_at: string
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      post_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_acknowledgments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
          is_blocked: boolean | null
          is_internal_test: boolean
          last_login_at: string | null
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_blocked?: boolean | null
          is_internal_test?: boolean
          last_login_at?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          is_internal_test?: boolean
          last_login_at?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_media_links: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          id: string
          link_type: string
          project_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          link_type?: string
          project_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
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
      project_phase_history: {
        Row: {
          column_id: string | null
          duration_hours: number | null
          entered_at: string
          exited_at: string | null
          id: string
          phase: Database["public"]["Enums"]["kanban_phase"]
          project_id: string
          workspace_id: string
        }
        Insert: {
          column_id?: string | null
          duration_hours?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          phase: Database["public"]["Enums"]["kanban_phase"]
          project_id: string
          workspace_id: string
        }
        Update: {
          column_id?: string | null
          duration_hours?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          phase?: Database["public"]["Enums"]["kanban_phase"]
          project_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phase_history_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phase_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phase_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          created_at: string
          external_name: string | null
          id: string
          invitation_id: string | null
          is_external: boolean | null
          payment_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phase: Database["public"]["Enums"]["kanban_phase"]
          project_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          external_name?: string | null
          id?: string
          invitation_id?: string | null
          is_external?: boolean | null
          payment_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phase: Database["public"]["Enums"]["kanban_phase"]
          project_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          external_name?: string | null
          id?: string
          invitation_id?: string | null
          is_external?: boolean | null
          payment_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phase?: Database["public"]["Enums"]["kanban_phase"]
          project_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_team_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "workspace_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          checklist_templates: Json | null
          created_at: string | null
          default_priority: string | null
          description: string | null
          id: string
          is_default: boolean | null
          item_type: string | null
          name: string
          task_templates: Json | null
          type: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          checklist_templates?: Json | null
          created_at?: string | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          item_type?: string | null
          name: string
          task_templates?: Json | null
          type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          checklist_templates?: Json | null
          created_at?: string | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          item_type?: string | null
          name?: string
          task_templates?: Json | null
          type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
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
          client_paid_at: string | null
          client_payment_due_date: string | null
          client_payment_status: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_phase: Database["public"]["Enums"]["kanban_phase"]
          custo_captacao: number | null
          custo_edicao: number | null
          custom_category_id: string | null
          custos_extras: number | null
          custos_extras_payment_status: string | null
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
          client_paid_at?: string | null
          client_payment_due_date?: string | null
          client_payment_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["kanban_phase"]
          custo_captacao?: number | null
          custo_edicao?: number | null
          custom_category_id?: string | null
          custos_extras?: number | null
          custos_extras_payment_status?: string | null
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
          client_paid_at?: string | null
          client_payment_due_date?: string | null
          client_payment_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["kanban_phase"]
          custo_captacao?: number | null
          custo_edicao?: number | null
          custom_category_id?: string | null
          custos_extras?: number | null
          custos_extras_payment_status?: string | null
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
      promo_code_redemptions: {
        Row: {
          id: string
          promo_code_id: string
          redeemed_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          id?: string
          promo_code_id: string
          redeemed_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          id?: string
          promo_code_id?: string
          redeemed_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          trial_days: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          trial_days?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          trial_days?: number
          used_count?: number
        }
        Relationships: []
      }
      protected_accounts: {
        Row: {
          email: string
          id: string
          protected_at: string | null
          protected_by: string | null
          reason: string | null
        }
        Insert: {
          email: string
          id?: string
          protected_at?: string | null
          protected_by?: string | null
          reason?: string | null
        }
        Update: {
          email?: string
          id?: string
          protected_at?: string | null
          protected_by?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      push_notification_queue: {
        Row: {
          attempts: number
          body: string
          created_at: string
          data: Json | null
          error: string | null
          id: string
          last_attempt_at: string | null
          processed_at: string | null
          status: string
          tag: string | null
          title: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          processed_at?: string | null
          status?: string
          tag?: string | null
          title: string
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          processed_at?: string | null
          status?: string
          tag?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          amount_subtotal: number
          amount_tax: number | null
          amount_total: number
          billing_reason: string | null
          created_at: string | null
          currency: string
          customer_country: string | null
          customer_tax_id: string | null
          customer_tax_id_valid: boolean | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf_url: string | null
          paid_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          tax_rate_percent: number | null
          tax_type: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          amount_subtotal: number
          amount_tax?: number | null
          amount_total: number
          billing_reason?: string | null
          created_at?: string | null
          currency?: string
          customer_country?: string | null
          customer_tax_id?: string | null
          customer_tax_id_valid?: boolean | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          tax_rate_percent?: number | null
          tax_type?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          amount_subtotal?: number
          amount_tax?: number | null
          amount_total?: number
          billing_reason?: string | null
          created_at?: string | null
          currency?: string
          customer_country?: string | null
          customer_tax_id?: string | null
          customer_tax_id_valid?: boolean | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          tax_rate_percent?: number | null
          tax_type?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admins: {
        Row: {
          created_at: string | null
          id: string
          is_protected: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_protected?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_protected?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
          conversation_id: string | null
          created_at: string
          created_by: string | null
          created_from_message_id: string | null
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
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          created_from_message_id?: string | null
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
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          created_from_message_id?: string | null
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
            foreignKeyName: "tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_from_message_id_fkey"
            columns: ["created_from_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
      user_preferences: {
        Row: {
          created_at: string
          email_marketing: boolean
          email_payment_reminders: boolean
          email_project_updates: boolean
          email_team_activity: boolean
          email_weekly_summary: boolean
          id: string
          notify_deadline_reminder: boolean
          notify_new_project: boolean
          notify_payment_received: boolean
          notify_task_assigned: boolean
          notify_team_updates: boolean
          sidebar_auto_collapse: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_marketing?: boolean
          email_payment_reminders?: boolean
          email_project_updates?: boolean
          email_team_activity?: boolean
          email_weekly_summary?: boolean
          id?: string
          notify_deadline_reminder?: boolean
          notify_new_project?: boolean
          notify_payment_received?: boolean
          notify_task_assigned?: boolean
          notify_team_updates?: boolean
          sidebar_auto_collapse?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_marketing?: boolean
          email_payment_reminders?: boolean
          email_project_updates?: boolean
          email_team_activity?: boolean
          email_weekly_summary?: boolean
          id?: string
          notify_deadline_reminder?: boolean
          notify_new_project?: boolean
          notify_payment_received?: boolean
          notify_task_assigned?: boolean
          notify_team_updates?: boolean
          sidebar_auto_collapse?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_preferences: {
        Row: {
          advance_hours: number | null
          created_at: string | null
          deadlines_enabled: boolean | null
          events_enabled: boolean | null
          id: string
          messages_enabled: boolean | null
          push_enabled: boolean | null
          push_subscription: Json | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advance_hours?: number | null
          created_at?: string | null
          deadlines_enabled?: boolean | null
          events_enabled?: boolean | null
          id?: string
          messages_enabled?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advance_hours?: number | null
          created_at?: string | null
          deadlines_enabled?: boolean | null
          events_enabled?: boolean | null
          id?: string
          messages_enabled?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_approval_tokens: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          project_id: string | null
          task_id: string | null
          token: string
          token_hash: string | null
          workspace_id: string
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          project_id?: string | null
          task_id?: string | null
          token?: string
          token_hash?: string | null
          workspace_id: string
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          project_id?: string | null
          task_id?: string | null
          token?: string
          token_hash?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_approval_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_approval_tokens_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_approval_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_approvals: {
        Row: {
          approved_at: string
          approved_by_client: boolean
          approved_by_user_id: string | null
          client_name: string | null
          id: string
          notes: string | null
          project_id: string | null
          task_id: string | null
          video_version_id: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string
          approved_by_client?: boolean
          approved_by_user_id?: string | null
          client_name?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          task_id?: string | null
          video_version_id: string
          workspace_id: string
        }
        Update: {
          approved_at?: string
          approved_by_client?: boolean
          approved_by_user_id?: string | null
          client_name?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          task_id?: string | null
          video_version_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_approvals_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_approvals_video_version_id_fkey"
            columns: ["video_version_id"]
            isOneToOne: false
            referencedRelation: "video_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          author_id: string | null
          body: string
          client_name: string | null
          created_at: string
          id: string
          is_client_comment: boolean
          parent_id: string | null
          project_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          task_id: string | null
          timestamp_seconds: number
          video_version_id: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          client_name?: string | null
          created_at?: string
          id?: string
          is_client_comment?: boolean
          parent_id?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          task_id?: string | null
          timestamp_seconds?: number
          video_version_id: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          client_name?: string | null
          created_at?: string
          id?: string
          is_client_comment?: boolean
          parent_id?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          task_id?: string | null
          timestamp_seconds?: number
          video_version_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_version_id_fkey"
            columns: ["video_version_id"]
            isOneToOne: false
            referencedRelation: "video_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_retention_queue: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          retention_days: number
          scheduled_deletion_at: string
          status: string
          task_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          retention_days?: number
          scheduled_deletion_at: string
          status?: string
          task_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          retention_days?: number
          scheduled_deletion_at?: string
          status?: string
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_retention_queue_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_retention_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_structure_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          segments: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          segments?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          segments?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_structure_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_structures: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_duration_seconds: number | null
          min_duration_seconds: number
          name: string
          notes: string | null
          position: number
          project_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_duration_seconds?: number | null
          min_duration_seconds?: number
          name: string
          notes?: string | null
          position?: number
          project_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_duration_seconds?: number | null
          min_duration_seconds?: number
          name?: string
          notes?: string | null
          position?: number
          project_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_structures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_structures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_versions: {
        Row: {
          cloudflare_stream_uid: string | null
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          is_deleted: boolean | null
          mime_type: string | null
          project_id: string
          r2_key: string | null
          stream_playback_url: string | null
          stream_status: string | null
          stream_thumbnail_url: string | null
          task_id: string | null
          thumbnail_path: string | null
          uploaded_by: string | null
          version_number: number
          workspace_id: string
        }
        Insert: {
          cloudflare_stream_uid?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          file_name: string
          file_path: string
          file_size_bytes?: number
          id?: string
          is_deleted?: boolean | null
          mime_type?: string | null
          project_id: string
          r2_key?: string | null
          stream_playback_url?: string | null
          stream_status?: string | null
          stream_thumbnail_url?: string | null
          task_id?: string | null
          thumbnail_path?: string | null
          uploaded_by?: string | null
          version_number?: number
          workspace_id: string
        }
        Update: {
          cloudflare_stream_uid?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          is_deleted?: boolean | null
          mime_type?: string | null
          project_id?: string
          r2_key?: string | null
          stream_playback_url?: string | null
          stream_status?: string | null
          stream_thumbnail_url?: string | null
          task_id?: string | null
          thumbnail_path?: string | null
          uploaded_by?: string | null
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_versions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_goals: {
        Row: {
          created_at: string | null
          id: string
          month: string
          projects_goal: number | null
          revenue_goal: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          projects_goal?: number | null
          revenue_goal?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          projects_goal?: number | null
          revenue_goal?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_goals_workspace_id_fkey"
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
          email_hash: string | null
          email_masked: string | null
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          token_hash: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          email_hash?: string | null
          email_masked?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          token_hash?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          email_hash?: string | null
          email_masked?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          token_hash?: string | null
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
      workspace_role_labels: {
        Row: {
          custom_label: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          custom_label: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          custom_label?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_role_labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_role_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_role_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_storage: {
        Row: {
          addon_tier: string | null
          base_storage_bytes: number
          created_at: string
          extra_storage_bytes: number
          id: string
          last_calculated_at: string
          storage_limit_bytes: number
          storage_used_bytes: number
          stripe_addon_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          addon_tier?: string | null
          base_storage_bytes?: number
          created_at?: string
          extra_storage_bytes?: number
          id?: string
          last_calculated_at?: string
          storage_limit_bytes?: number
          storage_used_bytes?: number
          stripe_addon_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          addon_tier?: string | null
          base_storage_bytes?: number
          created_at?: string
          extra_storage_bytes?: number
          id?: string
          last_calculated_at?: string
          storage_limit_bytes?: number
          storage_used_bytes?: number
          stripe_addon_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_storage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
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
      workspace_members_secure: {
        Row: {
          created_at: string | null
          hourly_rate: number | null
          id: string | null
          invited_at: string | null
          is_active: boolean | null
          joined_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          specialization: string[] | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          hourly_rate?: never
          id?: string | null
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          specialization?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          hourly_rate?: never
          id?: string | null
          invited_at?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          specialization?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
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
    }
    Functions: {
      accept_workspace_invitation: { Args: { p_token: string }; Returns: Json }
      add_workspace_storage: {
        Args: { p_bytes: number; p_workspace_id: string }
        Returns: undefined
      }
      can_access_feature: {
        Args: { p_feature: string; p_workspace_id: string }
        Returns: boolean
      }
      can_deliver_project: {
        Args: { p_phase: string; p_project_id: string }
        Returns: Json
      }
      can_edit_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_conversation_members: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { _profile_id: string }; Returns: boolean }
      count_admin_workspaces: { Args: { p_user_id: string }; Returns: number }
      count_total_invited_users: {
        Args: { p_user_id: string }
        Returns: number
      }
      count_total_projects: { Args: { p_user_id: string }; Returns: number }
      create_workspace_with_admin: {
        Args: {
          p_country?: Database["public"]["Enums"]["country_region"]
          p_currency?: string
          p_locale?: string
          p_name: string
          p_slug: string
          p_timezone?: string
        }
        Returns: string
      }
      decrypt_oauth_token: {
        Args: { _encrypted_token: string; _user_id: string }
        Returns: string
      }
      deliver_project:
        | {
            Args: {
              p_phase: string
              p_project_id: string
              p_target_column_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_delivered_at?: string
              p_phase: string
              p_project_id: string
              p_target_column_id: string
            }
            Returns: Json
          }
      encrypt_oauth_token: {
        Args: { _token: string; _user_id: string }
        Returns: string
      }
      get_blog_analytics: {
        Args: { days_back?: number }
        Returns: {
          post_id: string
          unique_sessions: number
          view_count: number
        }[]
      }
      get_contract_by_token: { Args: { _token: string }; Returns: Json }
      get_daily_page_views: {
        Args: { days_back?: number }
        Returns: {
          unique_sessions: number
          view_count: number
          view_date: string
        }[]
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          email: string
          email_masked: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          workspace_id: string
          workspace_name: string
        }[]
      }
      get_kanban_metrics: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_page_analytics: {
        Args: { days_back?: number }
        Returns: {
          page_path: string
          page_title: string
          unique_sessions: number
          view_count: number
        }[]
      }
      get_page_view_counts: {
        Args: never
        Returns: {
          month_views: number
          today_views: number
          week_views: number
        }[]
      }
      get_user_subscription_info: {
        Args: { p_user_id: string }
        Returns: {
          current_period_end: string
          projects_limit: number
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_status: string
          trial_ends_at: string
          users_limit: number
          workspaces_limit: number
        }[]
      }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_workspace_permission: {
        Args: {
          _permission_key: string
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      hash_email: { Args: { _email: string }; Returns: string }
      hash_invitation_token: { Args: { _token: string }; Returns: string }
      increment_promo_code_usage: {
        Args: { code_text: string }
        Returns: undefined
      }
      initialize_workspace_permissions: {
        Args: { _workspace_id: string }
        Returns: undefined
      }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_conversation_member_secure: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_internal_test_account: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      is_project_chat_in_user_workspace: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_protected_account: { Args: { _email: string }; Returns: boolean }
      is_public_channel_in_user_workspace: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_service_role: { Args: never; Returns: boolean }
      is_system_admin: { Args: never; Returns: boolean }
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
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      mark_contract_viewed: { Args: { _token: string }; Returns: Json }
      mask_email: { Args: { _email: string }; Returns: string }
      record_promo_redemption: {
        Args: { _promo_code_id: string; _workspace_id?: string }
        Returns: boolean
      }
      reopen_project: { Args: { p_project_id: string }; Returns: Json }
      sign_contract_public: {
        Args: {
          _ip_address?: string
          _signature_data: string
          _signer_name: string
          _token: string
          _user_agent?: string
        }
        Returns: Json
      }
      validate_promo_code: { Args: { _code: string }; Returns: Json }
      verify_beta_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          is_valid: boolean
          used_at: string
          used_by: string
        }[]
      }
      verify_invitation_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          email: string
          email_masked: string
          expires_at: string
          id: string
          is_valid: boolean
          role: Database["public"]["Enums"]["app_role"]
          workspace_id: string
          workspace_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "edicao" | "captacao" | "gestao" | "visualizacao"
      contract_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "expired"
        | "cancelled"
      conversation_type: "channel" | "project" | "dm"
      country_region: "PT" | "BR"
      followup_status: "open" | "done"
      kanban_phase: "captacao" | "edicao"
      lead_status:
        | "novo"
        | "contactado"
        | "qualificado"
        | "proposta"
        | "negociacao"
        | "ganho"
        | "perdido"
      message_type: "text" | "post" | "system"
      payment_status: "pendente" | "pago" | "vencido" | "cancelado"
      priority_level: "baixa" | "media" | "alta" | "urgente"
      project_category: "hotel" | "experiencia" | "evento" | "outro"
      project_type: "fotografia" | "video" | "foto_video"
      subscription_plan: "essencial" | "pro" | "studio" | "starter"
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
      app_role: ["admin", "edicao", "captacao", "gestao", "visualizacao"],
      contract_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "expired",
        "cancelled",
      ],
      conversation_type: ["channel", "project", "dm"],
      country_region: ["PT", "BR"],
      followup_status: ["open", "done"],
      kanban_phase: ["captacao", "edicao"],
      lead_status: [
        "novo",
        "contactado",
        "qualificado",
        "proposta",
        "negociacao",
        "ganho",
        "perdido",
      ],
      message_type: ["text", "post", "system"],
      payment_status: ["pendente", "pago", "vencido", "cancelado"],
      priority_level: ["baixa", "media", "alta", "urgente"],
      project_category: ["hotel", "experiencia", "evento", "outro"],
      project_type: ["fotografia", "video", "foto_video"],
      subscription_plan: ["essencial", "pro", "studio", "starter"],
    },
  },
} as const
