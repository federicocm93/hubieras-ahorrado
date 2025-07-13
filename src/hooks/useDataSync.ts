'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useExpensesStore } from '@/stores/expensesStore'

interface DataSyncState {
  isLoading: boolean
  hasError: boolean
  lastSync: Date | null
}

interface UseDataSyncReturn extends DataSyncState {
  syncData: (force?: boolean) => Promise<void>
  clearData: () => void
}

/**
 * Coordinated data synchronization hook following Next.js standards
 * Prevents duplicate requests and race conditions between stores
 */
export function useDataSync(): UseDataSyncReturn {
  const { user } = useAuth()
  const [syncInProgress, setSyncInProgress] = useState(false)
  const lastUserId = useRef<string | null>(null)
  const isMounted = useRef(true)
  
  // Store hooks
  const { 
    fetchCategories, 
    loading: categoriesLoading,
    clearCategories 
  } = useCategoriesStore()
  
  const { 
    fetchExpenses, 
    loading: expensesLoading,
    clearExpenses 
  } = useExpensesStore()

  // Combined loading state
  const isLoading = categoriesLoading || expensesLoading || syncInProgress
  const hasError = false // Can be enhanced to track errors from stores

  // Clear all data
  const clearData = useCallback(() => {
    clearCategories()
    clearExpenses()
    lastUserId.current = null
  }, [clearCategories, clearExpenses])

  // Coordinated data sync
  const syncData = useCallback(async (force = false) => {
    const currentUser = user
    if (!currentUser?.id || syncInProgress) {
      return
    }

    // Check if user changed
    const userChanged = lastUserId.current !== currentUser.id
    if (userChanged) {
      clearData()
      lastUserId.current = currentUser.id
      force = true
    }

    setSyncInProgress(true)
    
    try {
      // Fetch data in parallel but coordinated
      await Promise.all([
        fetchCategories(currentUser.id, force),
        fetchExpenses(currentUser.id, force)
      ])
    } catch (error) {
      console.error('❌ Data sync failed:', error)
      throw error
    } finally {
      if (isMounted.current) {
        setSyncInProgress(false)
      }
    }
  }, [user?.id, user?.email, syncInProgress, clearData, fetchCategories, fetchExpenses])

  // Auto-sync when user changes
  useEffect(() => {
    const userId = user?.id
    if (userId) {
      // Only sync if we haven't synced for this user before
      if (lastUserId.current !== userId) {
        syncData().catch(error => {
          console.error('Failed to sync data:', error)
        })
      }
    } else {
      // Clear data when no user
      clearData()
    }
  }, [user?.id, syncData, clearData])

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      setSyncInProgress(false)
    }
  }, [])

  return {
    isLoading,
    hasError,
    lastSync: null, // Can be enhanced to track last sync time
    syncData,
    clearData
  }
}