'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SharedExpenses from '@/components/SharedExpenses'
import LoadingOverlay from '@/components/LoadingOverlay'
import toast from 'react-hot-toast'

interface Group {
  id: string
  name: string
  created_by: string
  created_at: string
}

export default function GroupExpensesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = params['group-id'] as string

  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    
    if (user && groupId) {
      fetchGroup()
    }
  }, [user, groupId, router])

  const fetchGroup = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-group-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ group_id: groupId }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.hasAccess) {
        toast.error('No tienes acceso a este grupo')
        router.push('/groups')
        return
      }

      setGroup(data.group)
      console.log('📊 Group details fetched via edge function:', data.group)
    } catch (error) {
      console.error('Error fetching group:', error)
      toast.error('Error al cargar el grupo')
      router.push('/groups')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {loading ? (
        // Show a basic page structure while loading
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white shadow-sm">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            </div>
          </div>
        </div>
      ) : !group ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Grupo no encontrado</h2>
            <p className="text-gray-500 mb-4">No tienes acceso a este grupo o no existe.</p>
            <button
              onClick={() => router.push('/groups')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Volver a grupos
            </button>
          </div>
        </div>
      ) : (
        <SharedExpenses
          group={group as Group}
          onBack={() => router.push('/groups')}
        />
      )}
      
      {/* Loading Overlay with proper backdrop */}
      <LoadingOverlay isVisible={loading} />
    </div>
  )
}