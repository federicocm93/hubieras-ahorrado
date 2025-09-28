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
          group_id?: string
          paid_by?: string
        }
        Insert: {
          id?: string
          amount: number
          description: string
          category_id: string
          user_id: string
          date: string
          created_at?: string
          group_id?: string
          paid_by?: string
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          category_id?: string
          user_id?: string
          date?: string
          created_at?: string
          group_id?: string
          paid_by?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      group_invitations: {
        Row: {
          id: string
          group_id: string
          invited_by: string
          invited_email: string
          invited_user_id?: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          responded_at?: string
        }
        Insert: {
          id?: string
          group_id: string
          invited_by: string
          invited_email: string
          invited_user_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          responded_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          responded_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'group_invitation' | 'expense_added' | 'payment_request'
          title: string
          message: string
          read: boolean
          data?: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'group_invitation' | 'expense_added' | 'payment_request'
          title: string
          message: string
          read?: boolean
          data?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'group_invitation' | 'expense_added' | 'payment_request'
          title?: string
          message?: string
          read?: boolean
          data?: Record<string, unknown>
          created_at?: string
        }
      }
      ,
      monthly_limits: {
        Row: {
          user_id: string
          currency: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          currency: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          currency?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}