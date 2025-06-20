export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      streaks: {
        Row: {
          id: string
          user_id: string
          streak: number
          last_check_in: string
          start_date: string
          hour_count: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          streak: number
          last_check_in: string
          start_date: string
          hour_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          streak?: number
          last_check_in?: string
          start_date?: string
          hour_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Enums: {}
    Functions: {}
  }
} 