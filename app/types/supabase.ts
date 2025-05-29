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