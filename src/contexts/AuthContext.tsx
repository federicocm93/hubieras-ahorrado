'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Failed to get initial session:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        // Create default categories for new users
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await createDefaultCategories(session.user.id)
          } catch (error) {
            console.error('Error creating default categories:', error)
          }
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const createDefaultCategories = async (userId: string) => {
    // Check if user already has categories
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (existingCategories && existingCategories.length > 0) {
      return // User already has categories
    }

    // Create default categories
    const defaultCategories = [
      'Comida y Restaurantes',
      'Transporte', 
      'Compras',
      'Entretenimiento',
      'Facturas y Servicios',
      'Salud',
      'Educación',
      'Viajes',
      'Otros'
    ]

    const categoriesToInsert = defaultCategories.map(name => ({
      name,
      user_id: userId,
      is_default: true
    }))

    await supabase
      .from('categories')
      .insert(categoriesToInsert)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}