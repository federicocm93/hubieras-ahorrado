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
  members: GroupMember[]
}

interface GroupMember {
  id: string
  user_id: string
  user_email?: string
  joined_at: string
}

export default function GroupExpensesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = params['group-id'] as string

  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && groupId) {
      fetchGroup()
    }
  }, [user, groupId])

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
    router.push('/')
    return null
  }


  if (loading) {
    return <LoadingOverlay isVisible={true} />
  }

  if (!group) {
    return (
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
    )
  }

  return (
    <div className="relative">
      <SharedExpenses
        group={group as Group}
        onBack={() => router.push('/groups')}
      />
    </div>
  )
}