export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      content_hub: {
        Row: {
          content_type: string
          created_at: string | null
          description: string | null
          id: string
          related_symptoms: string[] | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          related_symptoms?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          related_symptoms?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          category: string | null
          completed: boolean | null
          created_at: string | null
          date: string | null
          goal: string
          id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean | null
          created_at?: string | null
          date?: string | null
          goal: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean | null
          created_at?: string | null
          date?: string | null
          goal?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_insights: {
        Row: {
          created_at: string | null
          id: string
          quote: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quote: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quote?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          full_name: string | null
          id: string
          last_check_in: string | null
          menopause_stage: string | null
          phone: string | null
          updated_at: string | null
          username: string | null
          wellness_score: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          last_check_in?: string | null
          menopause_stage?: string | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
          wellness_score?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_check_in?: string | null
          menopause_stage?: string | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
          wellness_score?: number | null
        }
        Relationships: []
      }
      session_messages: {
        Row: {
          id: string
          message: string
          sender: string
          session_id: string
          timestamp: string
        }
        Insert: {
          id?: string
          message: string
          sender: string
          session_id: string
          timestamp?: string
        }
        Update: {
          id?: string
          message?: string
          sender?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_tracking: {
        Row: {
          id: string
          intensity: number
          notes: string | null
          recorded_at: string
          source: string
          symptom: string
          user_id: string
        }
        Insert: {
          id?: string
          intensity?: number
          notes?: string | null
          recorded_at?: string
          source?: string
          symptom: string
          user_id: string
        }
        Update: {
          id?: string
          intensity?: number
          notes?: string | null
          recorded_at?: string
          source?: string
          symptom?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          ended_at: string | null
          id: string
          session_type: string
          started_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          birth_date: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          menopause_stage: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          menopause_stage?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          menopause_stage?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wellness_goals: {
        Row: {
          category: string
          completed: number
          created_at: string | null
          id: string
          total: number
          user_id: string
        }
        Insert: {
          category: string
          completed?: number
          created_at?: string | null
          id?: string
          total?: number
          user_id: string
        }
        Update: {
          category?: string
          completed?: number
          created_at?: string | null
          id?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
