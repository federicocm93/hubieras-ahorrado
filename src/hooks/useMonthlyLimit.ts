'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface UseMonthlyLimitReturn {
  limit: number | null
  loading: boolean
  saving: boolean
  error: string | null
  saveLimit: (amount: number) => Promise<void>
}

export function useMonthlyLimit(currency: string): UseMonthlyLimitReturn {
  const { user } = useAuth()
  const [limit, setLimit] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLimit = async () => {
      if (!user?.id || !currency) {
        setLimit(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('monthly_limits')
          .select('amount')
          .eq('user_id', user.id)
          .eq('currency', currency)
          .maybeSingle()

        if (error) {
          throw error
        }

        setLimit(data?.amount ?? null)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        console.error('Error fetching monthly limit:', message)
      } finally {
        setLoading(false)
      }
    }

    fetchLimit()
  }, [user?.id, currency])

  const saveLimit = useCallback(async (amount: number) => {
    if (!user?.id || !currency) return
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('monthly_limits')
        .upsert({ user_id: user.id, currency, amount }, { onConflict: 'user_id,currency' })

      if (error) throw error
      setLimit(amount)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error saving monthly limit:', message)
    } finally {
      setSaving(false)
    }
  }, [user?.id, currency])

  return { limit, loading, saving, error, saveLimit }
}


