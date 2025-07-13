import { useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRequestQueue } from './useRequestQueue'
import { supabase } from '@/lib/supabase'

interface Group {
  id: string
  name: string
  created_by: string
  created_at: string
  members: GroupMember[]
}

interface GroupMember {
  id: string
  user_id: string
  user_email?: string
  joined_at: string
}

interface SharedExpense {
  id: string
  amount: number
  description: string
  date: string
  paid_by: string
  paid_by_email?: string
  category: {
    id: string
    name: string
  }
  group_id: string
}

interface PendingInvitation {
  id: string
  group_id: string
  invited_by: string
  invited_email: string
  status: string
  created_at: string
  groups: {
    id: string
    name: string
    created_by: string
    created_at: string
  }[]
}

interface UserGroupsResponse {
  groups: Group[]
  pendingInvitations: PendingInvitation[]
}

interface GroupDetailsResponse {
  group: Group
  hasAccess: boolean
}

interface SharedExpensesResponse {
  members: GroupMember[]
  expenses: SharedExpense[]
  balances: Record<string, number>
}

interface DashboardResponse {
  prefetched: boolean
  timestamp: number
}

type PrefetchData = UserGroupsResponse | GroupDetailsResponse | SharedExpensesResponse | DashboardResponse

interface PrefetchCache {
  [key: string]: {
    data: PrefetchData
    timestamp: number
  }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function usePrefetch() {
  const { user } = useAuth()
  const { enqueue } = useRequestQueue()
  const cache = useRef<PrefetchCache>({})

  const prefetchGroups = useCallback(async (): Promise<UserGroupsResponse | undefined> => {
    if (!user) return

    const cacheKey = 'groups'
    const cached = cache.current[cacheKey]
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as UserGroupsResponse
    }

    return enqueue(cacheKey, async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('No session')

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-user-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch groups')

      const data = await response.json()
      
      if (data.error) throw new Error(data.error)

      cache.current[cacheKey] = {
        data: data,
        timestamp: Date.now()
      }
      console.log('🚀 Groups prefetched successfully')
      return data
    })
  }, [user, enqueue])

  const prefetchGroupDetails = useCallback(async (groupId: string): Promise<GroupDetailsResponse | undefined> => {
    if (!user || !groupId) return

    const cacheKey = `group-${groupId}`
    const cached = cache.current[cacheKey]
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as GroupDetailsResponse
    }

    return enqueue(cacheKey, async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('No session')

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-group-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ group_id: groupId }),
      })

      if (!response.ok) throw new Error('Failed to fetch group details')

      const data = await response.json()
      
      if (data.error) throw new Error(data.error)

      cache.current[cacheKey] = {
        data: data,
        timestamp: Date.now()
      }
      console.log(`🚀 Group ${groupId} details prefetched successfully`)
      return data
    })
  }, [user, enqueue])

  const prefetchSharedExpenses = useCallback(async (groupId: string): Promise<SharedExpensesResponse | undefined> => {
    if (!user || !groupId) return

    const cacheKey = `expenses-${groupId}`
    const cached = cache.current[cacheKey]
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as SharedExpensesResponse
    }

    return enqueue(cacheKey, async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('No session')

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-shared-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ group_id: groupId }),
      })

      if (!response.ok) throw new Error('Failed to fetch shared expenses')

      const data = await response.json()
      
      if (data.error) throw new Error(data.error)

      cache.current[cacheKey] = {
        data: data,
        timestamp: Date.now()
      }
      console.log(`🚀 Shared expenses for group ${groupId} prefetched successfully`)
      return data
    })
  }, [user, enqueue])

  const prefetchDashboardData = useCallback(async (): Promise<DashboardResponse | undefined> => {
    if (!user) return

    const cacheKey = 'dashboard'
    const cached = cache.current[cacheKey]
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as DashboardResponse
    }

    return enqueue(cacheKey, async () => {
      // Prefetch categories and expenses data that the dashboard needs
      // This simulates what the dashboard stores would fetch
      console.log('🚀 Dashboard data prefetch initiated (categories & expenses)')
      
      // Note: We're not making actual API calls here since the dashboard uses Zustand stores
      // The stores handle their own caching. This is more of a placeholder for future enhancement
      // where we might want to prime specific dashboard data.
      
      const dashboardData: DashboardResponse = { 
        prefetched: true, 
        timestamp: Date.now() 
      }
      
      cache.current[cacheKey] = {
        data: dashboardData,
        timestamp: Date.now()
      }
      
      return dashboardData
    })
  }, [user, enqueue])

  const getCachedData = useCallback((key: string): PrefetchData | null => {
    const cached = cache.current[key]
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }, [])

  const clearCache = useCallback(() => {
    cache.current = {}
  }, [])

  return {
    prefetchGroups,
    prefetchGroupDetails,
    prefetchSharedExpenses,
    prefetchDashboardData,
    getCachedData,
    clearCache
  }
}