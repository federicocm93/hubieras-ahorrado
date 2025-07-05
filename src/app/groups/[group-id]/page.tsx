'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SharedExpenses from '@/components/SharedExpenses'
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
      // Step 1: Check if user is a member of this group
      const { data: membershipData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('group_id', groupId)
        .eq('user_id', user?.id)
        .single()

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError
      }

      // Step 2: Check if user is the creator of this group
      const { data: creatorData, error: creatorError } = await supabase
        .from('groups')
        .select('id, name, created_by, created_at')
        .eq('id', groupId)
        .eq('created_by', user?.id)
        .single()

      if (creatorError && creatorError.code !== 'PGRST116') {
        // If it's not a "not found" error, throw it
        if (creatorError.code !== 'PGRST116') {
          throw creatorError
        }
      }

      // Step 3: If user is neither member nor creator, deny access
      if (!membershipData && !creatorData) {
        toast.error('No tienes acceso a este grupo')
        router.push('/groups')
        return
      }

      // Step 4: Get group details (use creator data if available, otherwise fetch)
      let groupData = creatorData
      if (!groupData) {
        const { data: groupInfo, error: groupError } = await supabase
          .from('groups')
          .select('id, name, created_by, created_at')
          .eq('id', groupId)
          .single()

        if (groupError) throw groupError
        groupData = groupInfo
      }

      // Step 5: Get all group members with their emails
      const { data: membersWithEmails, error: membersError } = await supabase
        .rpc('get_group_members_with_emails', { group_id_param: groupId })

      if (membersError) {
        console.log('⚠️ Could not fetch members with emails:', membersError.message)
        // Fallback to basic member info
        const { data: basicMembers, error: basicError } = await supabase
          .from('group_members')
          .select('id, user_id, joined_at')
          .eq('group_id', groupId)

        if (basicError) throw basicError

        const membersWithFallbackEmails = (basicMembers || []).map((member) => ({
          ...member,
          user_email: member.user_id === user?.id ? user?.email : 'Email no disponible'
        }))

        setGroup({
          ...groupData,
          members: membersWithFallbackEmails
        })
      } else {
        setGroup({
          ...groupData,
          members: membersWithEmails || []
        })
      }
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
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
    <SharedExpenses
      group={group}
      onBack={() => router.push('/groups')}
    />
  )
}