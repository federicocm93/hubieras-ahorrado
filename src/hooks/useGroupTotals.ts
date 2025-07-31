import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export interface GroupTotal {
  id: string
  name: string
  total: number
  currency: string
}

export const useGroupTotals = (month?: number, year?: number, currency?: string) => {
  const { user } = useAuth()
  const [groupTotals, setGroupTotals] = useState<GroupTotal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGroupTotals = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setGroupTotals(data.groupTotals || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error fetching group totals:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, month, year, currency])

  useEffect(() => {
    fetchGroupTotals()
  }, [fetchGroupTotals])

  return {
    groupTotals,
    loading,
    error,
    refetch: fetchGroupTotals
  }
}