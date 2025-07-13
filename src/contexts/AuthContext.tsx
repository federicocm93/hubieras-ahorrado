'use client'

import { createContext, useContext, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useSession } from '@/hooks/useSession'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  checkPendingInvitations: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  checkPendingInvitations: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useSession()

  // Handle side effects when user signs in
  useEffect(() => {
    if (user) {
      // Create default categories for new users (non-blocking)
      createDefaultCategories(user.id).catch(error => {
        console.error('Error creating default categories:', error)
      })
      
      // Check for pending invitations (non-blocking)
      checkPendingInvitationsForUser(user).catch(error => {
        console.error('Error checking pending invitations:', error)
      })
    }
  }, [user]) // Only run when user changes

  const createDefaultCategories = async (userId: string) => {
    try {
      // Check if user already has categories
      const { data: existingCategories, error: selectError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)

      if (selectError) {
        console.error('Error checking existing categories:', selectError)
        return
      }

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

      const { error: insertError } = await supabase
        .from('categories')
        .insert(categoriesToInsert)

      if (insertError) {
        console.error('Error creating default categories:', insertError)
      }
    } catch (error) {
      console.error('Error in createDefaultCategories:', error)
    }
  }

  const checkPendingInvitationsForUser = async (user: User) => {
    try {
      console.log('🔍 Checking pending invitations for user:', user.email)
      
      // Check for pending invitations for this user's email
      const { data: pendingInvitations, error: selectError } = await supabase
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

      console.log('📋 Pending invitations query result:', { pendingInvitations, selectError })

      if (selectError) {
        console.error('Error fetching pending invitations:', selectError)
        return
      }

      if (!pendingInvitations || pendingInvitations.length === 0) {
        console.log('✅ No pending invitations found')
        return
      }

      console.log('📨 Found pending invitations:', pendingInvitations)

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

      console.log('✅ Updated invitations with user_id')

      // Create notifications for each pending invitation
      const notifications = pendingInvitations.map(invitation => {
        // Extract group name from the joined data
        let groupName = 'Unknown'
        try {
          const groups = invitation.groups as unknown
          if (Array.isArray(groups) && groups.length > 0) {
            groupName = groups[0]?.name || 'Unknown'
          } else if (groups && typeof groups === 'object' && 'name' in groups) {
            groupName = (groups as { name: string }).name || 'Unknown'
          }
        } catch (error) {
          console.warn('Could not extract group name:', error)
        }
        
        console.log('📝 Creating notification for invitation:', { invitation, groupName })
        
        return {
          user_id: user.id,
          type: 'group_invitation' as const,
          title: 'Invitación a grupo',
          message: `Te han invitado al grupo "${groupName}"`,
          data: {
            group_id: invitation.group_id,
            invitation_id: invitation.id
          }
        }
      })

      console.log('📝 Creating notifications:', notifications)

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('❌ Error creating notifications:', notificationError)
      } else {
        console.log('✅ Notifications created successfully')
      }
    } catch (error) {
      console.error('❌ Error checking pending invitations:', error)
    }
  }

  const checkPendingInvitations = async () => {
    if (user) {
      await checkPendingInvitationsForUser(user)
    }
  }

  const value = {
    user,
    loading,
    signOut,
    checkPendingInvitations,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}