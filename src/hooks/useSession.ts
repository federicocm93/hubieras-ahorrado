'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface SessionState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

interface UseSessionReturn extends SessionState {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

/**
 * Optimized session hook following Next.js standards
 * Prevents race conditions and multiple re-renders
 */
export function useSession(): UseSessionReturn {
  const [state, setState] = useState<SessionState>({
    user: null,
    session: null,
    loading: true,
    error: null
  })
  
  const isMounted = useRef(true)
  const initialized = useRef(false)
  const initializationComplete = useRef(false)
  const authSubscription = useRef<ReturnType<typeof supabase.auth.onAuthStateChange> | null>(null)


  // Initialize session only once
  const initializeSession = useCallback(async () => {
    if (initialized.current) return
    initialized.current = true

    try {
      console.log('🔄 Initializing session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (!isMounted.current) return
      
      if (error) {
        console.error('Session initialization error:', error)
        if (isMounted.current) {
          setState({ 
            user: null, 
            session: null, 
            loading: false, 
            error: error.message 
          })
        }
        return
      }

      if (isMounted.current) {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null
        })
      }

      initializationComplete.current = true
      console.log('✅ Session initialized:', session?.user?.email || 'No session')
    } catch (error) {
      console.error('Failed to initialize session:', error)
      if (isMounted.current) {
        setState({ 
          user: null, 
          session: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
      initializationComplete.current = true
    }
  }, [])

  // Handle auth state changes
  const handleAuthChange = useCallback((event: string, session: Session | null) => {
    if (!isMounted.current) return
    
    console.log('🔄 Auth state change:', event, session?.user?.email)
    
    if (isMounted.current) {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        error: null
      }))
    }
  }, [])

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }))
        throw error
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }, [])

  // Refresh session function
  const refreshSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }))
        throw error
      }

      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Refresh session error:', error)
      setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unknown error' }))
      throw error
    }
  }, [])

  // Setup auth listener and initialize
  useEffect(() => {
    // Prevent running multiple times
    if (initialized.current) return
    
    isMounted.current = true
    
    // Initialize session
    initializeSession()
    
    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
    authSubscription.current = { data: { subscription } }
    
    // Fallback timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted.current && !initializationComplete.current) {
        console.log('⚠️ Session timeout - forcing loading to false')
        setState(prev => ({ ...prev, loading: false }))
        initializationComplete.current = true
      }
    }, 8000) // 8 seconds timeout
    
    return () => {
      isMounted.current = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array to only run once

  return {
    ...state,
    signOut,
    refreshSession
  }
}