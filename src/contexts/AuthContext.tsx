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

  // Emergency fallback - always set loading to false after 3 seconds
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      console.log('🚨 EMERGENCY: Forcing loading to false after 3 seconds')
      setLoading(false)
    }, 3000)

    return () => clearTimeout(emergencyTimeout)
  }, [])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    // Get initial session with aggressive timeout and fallback
    const getInitialSession = async () => {
      console.log('🔍 Starting auth check...')
      
      // Set a fallback timeout that will always resolve loading
      timeoutId = setTimeout(() => {
        console.log('⚠️ Auth timeout reached, forcing loading to false')
        setLoading(false)
        setUser(null)
      }, 5000)

      try {
        console.log('📡 Getting session from Supabase...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          clearInvalidSession()
          setUser(null)
          return
        }
        
        if (session?.user) {
          console.log('✅ Session found, user:', session.user.email)
          setUser(session.user)
          
          // Check for pending invitations (non-blocking)
          setTimeout(() => {
            checkPendingInvitations(session.user).catch(error => {
              console.error('Error checking pending invitations:', error)
            })
          }, 100)
        } else {
          console.log('ℹ️ No session found')
          setUser(null)
        }
      } catch (error) {
        console.error('💥 Failed to get initial session:', error)
        clearInvalidSession()
        setUser(null)
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
        console.log('✅ Auth check completed')
      }
    }

    const clearInvalidSession = () => {
      try {
        console.log('🧹 Clearing invalid session data...')
        // Clear localStorage immediately and synchronously
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        // Also try to sign out (but don't await it)
        supabase.auth.signOut().catch(() => {})
      } catch (error) {
        console.error('Error clearing session:', error)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        // Create default categories for new users and check for pending invitations
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await createDefaultCategories(session.user.id)
            // Don't await this to avoid blocking
            checkPendingInvitations(session.user).catch(error => {
              console.error('Error checking pending invitations:', error)
            })
          } catch (error) {
            console.error('Error creating default categories:', error)
          }
        }
        
        setLoading(false)
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const createDefaultCategories = async (userId: string) => {
    try {
      // Use a more thorough check to prevent race conditions
      const { data: existingCategories, error: selectError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)

      if (selectError) {
        console.error('Error checking existing categories:', selectError)
        return
      }

      if (existingCategories && existingCategories.length > 0) {
        console.log('User already has categories, skipping creation')
        return // User already has categories
      }

      // Create default categories (Spanish version to replace English DB function)
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

      // Insert categories with conflict handling
      const { error: insertError } = await supabase
        .from('categories')
        .insert(categoriesToInsert)

      if (insertError) {
        console.error('Error creating default categories:', insertError)
      } else {
        console.log('Default categories created successfully')
      }
    } catch (error) {
      console.error('Error in createDefaultCategories:', error)
    }
  }

  const checkPendingInvitations = async (user: User) => {
    try {
      // Check for pending invitations for this user's email
      const { data: pendingInvitations } = await supabase
        .from('group_invitations')
        .select(`
          id,
          group_id,
          invited_by,
          invited_email,
          groups!inner(name)
        `)
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .is('invited_user_id', null)

      if (!pendingInvitations || pendingInvitations.length === 0) {
        return
      }

      // Update invitations to include the user_id
      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ invited_user_id: user.id })
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .is('invited_user_id', null)

      if (updateError) {
        console.error('Error updating invitations:', updateError)
        return
      }

      // Create notifications for each pending invitation
      const notifications = pendingInvitations.map(invitation => ({
        user_id: user.id,
        type: 'group_invitation' as const,
        title: 'Invitación a grupo',
        message: `Te han invitado al grupo "${(invitation.groups as any).name}"`,
        data: {
          group_id: invitation.group_id,
          invitation_id: invitation.id
        }
      }))

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('Error creating notifications:', notificationError)
      }
    } catch (error) {
      console.error('Error checking pending invitations:', error)
    }
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