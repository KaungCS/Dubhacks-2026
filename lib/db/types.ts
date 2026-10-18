// Generated from supabase/migrations. Regenerate after schema changes:
//   npx supabase gen types typescript --project-id <id> > lib/db/types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      attendees: {
        Row: {
          id: string
          event_id: string
          email: string
          name: string | null
          rsvped_at: string | null
          attended: boolean
        }
        Insert: {
          id?: string
          event_id: string
          email: string
          name?: string | null
          rsvped_at?: string | null
          attended?: boolean
        }
        Update: {
          id?: string
          event_id?: string
          email?: string
          name?: string | null
          rsvped_at?: string | null
          attended?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          id: string
          workspace_id: string
          name: string
          task_items: Json
          file_types: string[]
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          task_items?: Json
          file_types?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          task_items?: Json
          file_types?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          id: string
          workspace_id: string
          title: string
          starts_at: string
          ends_at: string | null
          location: string | null
          status: Database["public"]["Enums"]["event_status"]
          template_id: string | null
          calendar_event_id: string | null
          drive_folder_id: string | null
          rsvp_form_id: string | null
          rsvp_form_url: string | null
          signin_sheet_id: string | null
          slides_id: string | null
          notes_id: string | null
          rsvp_target: number | null
          rsvp_target_notified_at: string | null
          attendance_fetched_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          starts_at: string
          ends_at?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          calendar_event_id?: string | null
          drive_folder_id?: string | null
          rsvp_form_id?: string | null
          rsvp_form_url?: string | null
          signin_sheet_id?: string | null
          slides_id?: string | null
          notes_id?: string | null
          rsvp_target?: number | null
          rsvp_target_notified_at?: string | null
          attendance_fetched_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          starts_at?: string
          ends_at?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          calendar_event_id?: string | null
          drive_folder_id?: string | null
          rsvp_form_id?: string | null
          rsvp_form_url?: string | null
          signin_sheet_id?: string | null
          slides_id?: string | null
          notes_id?: string | null
          rsvp_target?: number | null
          rsvp_target_notified_at?: string | null
          attendance_fetched_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: Database["public"]["Enums"]["member_role"]
          title: string | null
          joined_at: string
          left_at: string | null
          last_seen_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: Database["public"]["Enums"]["member_role"]
          title?: string | null
          joined_at?: string
          left_at?: string | null
          last_seen_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          title?: string | null
          joined_at?: string
          left_at?: string | null
          last_seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_snapshots: {
        Row: {
          id: string
          workspace_id: string
          metric: string
          period: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          metric: string
          period: string
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          metric?: string
          period?: string
          value?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          kind: string
          payload: Json
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          payload?: Json
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          label: string
          position: number
        }
        Insert: {
          id?: string
          poll_id: string
          label: string
          position?: number
        }
        Update: {
          id?: string
          poll_id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          id: string
          workspace_id: string
          question: string
          created_by: string | null
          closes_at: string | null
          multiple_choice: boolean
          results_visibility: Database["public"]["Enums"]["poll_visibility"]
          status: Database["public"]["Enums"]["poll_status"]
          closing_notified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          question: string
          created_by?: string | null
          closes_at?: string | null
          multiple_choice?: boolean
          results_visibility?: Database["public"]["Enums"]["poll_visibility"]
          status?: Database["public"]["Enums"]["poll_status"]
          closing_notified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          question?: string
          created_by?: string | null
          closes_at?: string | null
          multiple_choice?: boolean
          results_visibility?: Database["public"]["Enums"]["poll_visibility"]
          status?: Database["public"]["Enums"]["poll_status"]
          closing_notified_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          task_id: string
          user_id: string
          completed_at: string | null
        }
        Insert: {
          task_id: string
          user_id: string
          completed_at?: string | null
        }
        Update: {
          task_id?: string
          user_id?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          task_id: string
          user_id: string
        }
        Insert: {
          task_id: string
          user_id: string
        }
        Update: {
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          workspace_id: string
          event_id: string | null
          title: string
          description: string | null
          due_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          difficulty: Database["public"]["Enums"]["task_difficulty"]
          is_prereq: boolean
          completed_at: string | null
          prereq_notified_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          event_id?: string | null
          title: string
          description?: string | null
          due_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          difficulty?: Database["public"]["Enums"]["task_difficulty"]
          is_prereq?: boolean
          completed_at?: string | null
          prereq_notified_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          event_id?: string | null
          title?: string
          description?: string | null
          due_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          difficulty?: Database["public"]["Enums"]["task_difficulty"]
          is_prereq?: boolean
          completed_at?: string | null
          prereq_notified_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          google_sub: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          google_sub?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          google_sub?: string | null
          created_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          poll_id: string
          option_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          poll_id: string
          option_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          poll_id?: string
          option_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          id: string
          name: string
          school: string | null
          admin_user_id: string
          shared_drive_id: string | null
          calendar_id: string | null
          google_token: string | null
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          school?: string | null
          admin_user_id: string
          shared_drive_id?: string | null
          calendar_id?: string | null
          google_token?: string | null
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          school?: string | null
          admin_user_id?: string
          shared_drive_id?: string | null
          calendar_id?: string | null
          google_token?: string | null
          invite_code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      event_status: "planned" | "done" | "cancelled"
      member_role: "admin" | "officer"
      poll_status: "open" | "closed"
      poll_visibility: "live" | "after_vote" | "after_close"
      task_difficulty: "easy" | "medium" | "hard"
      task_status: "todo" | "in_progress" | "done"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
