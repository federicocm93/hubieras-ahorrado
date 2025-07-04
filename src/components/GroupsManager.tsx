'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Trash2, Calendar } from 'lucide-react'
import CreateGroupModal from './CreateGroupModal'
import SharedExpenses from './SharedExpenses'
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

interface GroupsManagerProps {
  onBack: () => void
}

export default function GroupsManager({ onBack }: GroupsManagerProps) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  useEffect(() => {
    if (user) {
      fetchGroups()
    }
  }, [user])

  const fetchGroups = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id)

      if (memberError) throw memberError

      // Get all members for each group with their emails
      const groupsWithMembers = await Promise.all(
        (memberGroups || []).map(async (memberGroup) => {
          const group = memberGroup.groups as any

          // Get all members for this group
          const { data: members, error: membersError } = await supabase
            .from('group_members')
            .select('id, user_id, joined_at')
            .eq('group_id', group.id)

          if (membersError) throw membersError

          // For demo purposes, we'll use a simple approach to get user emails
          // In a real app, you'd have a users table or use Supabase Auth admin API
          const membersWithEmails = (members || []).map((member) => ({
            ...member,
            user_email: member.user_id === user.id ? user.email : `user-${member.user_id.slice(0, 8)}@example.com`
          }))

          return {
            ...group,
            members: membersWithEmails
          }
        })
      )

      setGroups(groupsWithMembers)
    } catch (error: any) {
      console.error('Error fetching groups:', error.message)
      toast.error('Error al cargar grupos')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return

    if (!confirm('¿Estás seguro de que quieres salir de este grupo?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id)

      if (error) throw error

      setGroups(prev => prev.filter(group => group.id !== groupId))
      toast.success('Has salido del grupo exitosamente')
    } catch (error: any) {
      console.error('Error leaving group:', error.message)
      toast.error('Error al salir del grupo: ' + error.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (selectedGroup) {
    return (
      <SharedExpenses
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Users className="h-8 w-8 text-indigo-600 mr-3" />
                  Mis Grupos
                </h1>
                <p className="text-sm text-gray-600">
                  Gestiona tus grupos de gastos compartidos
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onBack}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Volver a Gastos Personales
                </button>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Crear Grupo
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {groups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes grupos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Crea tu primer grupo para compartir gastos con amigos, familia o compañeros.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Crear Grupo
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="bg-indigo-100 rounded-full p-2">
                          <Users className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {group.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLeaveGroup(group.id)
                          }}
                          className="text-red-500 hover:text-red-700"
                          title="Salir del grupo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {group.members.length} miembro{group.members.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Creado {formatDate(group.created_at)}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 3).map((member) => (
                          <div
                            key={member.id}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-500 text-white text-sm font-medium border-2 border-white"
                            title={member.user_email}
                          >
                            {member.user_email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        ))}
                        {group.members.length > 3 && (
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-500 text-white text-sm font-medium border-2 border-white">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <button className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        Ver gastos compartidos →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onSuccess={() => {
            setShowCreateGroup(false)
            fetchGroups()
          }}
        />
      )}
    </div>
  )
}