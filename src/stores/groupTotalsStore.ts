import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface GroupTotal {
  id: string
  name: string
  total: number
  currency: string
}

interface GroupTotalsStore {
  groupTotals: GroupTotal[]
  loading: boolean
  lastFetch: Date | null
  error: string | null
  currentUserId: string | null
  lastRequestKey: string | null
  
  // Actions
  fetchGroupTotals: (userId: string, month: number, year: number, currency?: string, forceRefresh?: boolean) => Promise<void>
  clearGroupTotals: () => void
  
  // Helpers
  shouldRefetch: () => boolean
  getRequestKey: (month: number, year: number, currency?: string) => string
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useGroupTotalsStore = create<GroupTotalsStore>((set, get) => ({
  groupTotals: [],
  loading: false,
  lastFetch: null,
  error: null,
  currentUserId: null,
  lastRequestKey: null,

  getRequestKey: (month: number, year: number, currency?: string) => {
    return `${month}-${year}-${currency || 'all'}`
  },

  shouldRefetch: () => {
    const { lastFetch } = get()
    if (!lastFetch) return true
    return Date.now() - lastFetch.getTime() > CACHE_DURATION
  },

  fetchGroupTotals: async (userId: string, month: number, year: number, currency?: string, forceRefresh = false) => {
    const { loading, shouldRefetch, currentUserId, lastRequestKey, getRequestKey, groupTotals } = get()
    
    const requestKey = getRequestKey(month, year, currency)
    
    // If user changed, clear cache and force refresh
    if (currentUserId !== userId) {
      set({ currentUserId: userId, groupTotals: [], lastFetch: null, lastRequestKey: null })
      forceRefresh = true
    }
    
    // If request parameters changed, force refresh
    if (lastRequestKey !== requestKey) {
      set({ lastRequestKey: requestKey })
      forceRefresh = true
    }
    
    // Return cached data if available and not stale
    if (!forceRefresh && groupTotals.length > 0 && !shouldRefetch()) {
      console.log('📦 Using cached group totals', { requestKey, groupTotalsCount: groupTotals.length })
      return
    }
    
    // Avoid multiple concurrent requests
    if (loading) {
      console.log('⏳ Group totals already loading')
      return
    }

    console.log('🔄 Fetching group totals from database for user:', userId)
    set({ loading: true, error: null })

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Group totals fetch timeout - forcing loading to false')
      set({ loading: false, error: 'Timeout al cargar totales de grupos' })
    }, 15000) // 15 seconds timeout

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-user-group-totals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ month, year, currency })
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      set({ 
        groupTotals: data.groupTotals || [], 
        loading: false, 
        lastFetch: new Date(),
        error: null 
      })
      
      console.log('✅ Group totals fetched successfully:', data.groupTotals?.length || 0)
    } catch (error) {
      clearTimeout(timeoutId)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error fetching group totals:', errorMessage)
      set({ 
        loading: false, 
        error: errorMessage 
      })
    }
  },

  clearGroupTotals: () => {
    set({ groupTotals: [], lastFetch: null, error: null, lastRequestKey: null })
  }
}))