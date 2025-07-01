import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          user_id: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          is_default?: boolean
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          amount: number
          description: string
          category_id: string
          user_id: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          amount: number
          description: string
          category_id: string
          user_id: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          category_id?: string
          user_id?: string
          date?: string
          created_at?: string
        }
      }
    }
  }
}