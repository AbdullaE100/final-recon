import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or anonymous key not provided in app.config.ts");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

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
  }
}