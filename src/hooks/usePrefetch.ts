import { useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface PrefetchCache {
  [key: string]: {
    data: any
    timestamp: number
  }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function usePrefetch() {
  const { user } = useAuth()
  const cache = useRef<PrefetchCache>({})
  const pendingRequests = useRef<Set<string>>(new Set())

  const prefetchGroups = useCallback(async () => {
    if (!user || pendingRequests.current.has('groups')) return

    const cacheKey = 'groups'
    const cached = cache.current[cacheKey]
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    pendingRequests.current.add('groups')
    
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-user-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      })

      if (!response.ok) return

      const data = await response.json()
      
      if (!data.error) {
        cache.current[cacheKey] = {
          data: data,
          timestamp: Date.now()
        }
        console.log('🚀 Groups prefetched successfully')
        return data
      }
    } catch (error) {
      console.error('Error prefetching groups:', error)
    } finally {
      pendingRequests.current.delete('groups')
    }
  }, [user])

  const prefetchGroupDetails = useCallback(async (groupId: string) => {
    if (!user || !groupId || pendingRequests.current.has(`group-${groupId}`)) return

    const cacheKey = `group-${groupId}`
    const cached = cache.current[cacheKey]
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    pendingRequests.current.add(`group-${groupId}`)
    
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-group-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ group_id: groupId }),
      })

      if (!response.ok) return

      const data = await response.json()
      
      if (!data.error) {
        cache.current[cacheKey] = {
          data: data,
          timestamp: Date.now()
        }
        console.log(`🚀 Group ${groupId} details prefetched successfully`)
        return data
      }
    } catch (error) {
      console.error(`Error prefetching group ${groupId}:`, error)
    } finally {
      pendingRequests.current.delete(`group-${groupId}`)
    }
  }, [user])

  const prefetchSharedExpenses = useCallback(async (groupId: string) => {
    if (!user || !groupId || pendingRequests.current.has(`expenses-${groupId}`)) return

    const cacheKey = `expenses-${groupId}`
    const cached = cache.current[cacheKey]
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    pendingRequests.current.add(`expenses-${groupId}`)
    
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-shared-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ group_id: groupId }),
      })

      if (!response.ok) return

      const data = await response.json()
      
      if (!data.error) {
        cache.current[cacheKey] = {
          data: data,
          timestamp: Date.now()
        }
        console.log(`🚀 Shared expenses for group ${groupId} prefetched successfully`)
        return data
      }
    } catch (error) {
      console.error(`Error prefetching shared expenses for group ${groupId}:`, error)
    } finally {
      pendingRequests.current.delete(`expenses-${groupId}`)
    }
  }, [user])

  const getCachedData = useCallback((key: string) => {
    const cached = cache.current[key]
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }, [])

  const clearCache = useCallback(() => {
    cache.current = {}
    pendingRequests.current.clear()
  }, [])

  return {
    prefetchGroups,
    prefetchGroupDetails,
    prefetchSharedExpenses,
    getCachedData,
    clearCache
  }
}