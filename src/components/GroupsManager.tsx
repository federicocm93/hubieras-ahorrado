'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Trash2, Calendar } from 'lucide-react'
import CreateGroupModal from './CreateGroupModal'
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

export default function GroupsManager() {
  const { user, checkPendingInvitations } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  useEffect(() => {
    if (user) {
      // Check for pending invitations first, then fetch groups
      checkPendingInvitations().then(() => {
        fetchGroups()
      }).catch(error => {
        console.error('Error checking pending invitations:', error)
        fetchGroups() // Still fetch groups even if invitation check fails
      })
    }
  }, [user, checkPendingInvitations])

  const fetchGroups = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Step 1: Get groups where user is a member (only get the group IDs)
      const { data: membershipData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      // Step 2: Get groups where user is the creator (these are allowed by the simple RLS policy)
      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('id, name, created_by, created_at')
        .eq('created_by', user.id)

      if (createdError) throw createdError

      // Step 3: Get group details for groups where user is a member
      const membershipGroupIds = (membershipData || []).map(m => m.group_id)
      console.log('🔍 User is member of groups:', membershipGroupIds)

      // Try to fetch groups where user is a member directly
      let memberGroups: Array<{
        id: string
        name: string
        created_by: string
        created_at: string
      }> = []
      if (membershipGroupIds.length > 0) {
        try {
          const { data: memberGroupsData, error: memberGroupsError } = await supabase
            .from('groups')
            .select('id, name, created_by, created_at')
            .in('id', membershipGroupIds)

          if (memberGroupsError) {
            console.log('⚠️ Could not fetch member groups due to RLS:', memberGroupsError.message)
          } else {
            memberGroups = memberGroupsData || []
            console.log('✅ Successfully fetched member groups:', memberGroups)
          }
        } catch (error) {
          console.log('⚠️ Error fetching member groups:', error)
        }
      }

      // Step 4: Get pending invitations (these will show groups user can potentially join)
      const { data: invitations, error: invitationsError } = await supabase
        .from('group_invitations')
        .select('id, group_id, invited_by, invited_email, status, created_at')
        .eq('invited_email', user.email)
        .eq('status', 'pending')

      if (invitationsError) throw invitationsError

      // Step 5: For each invitation, we need to get the group name
      // We'll do this by creating a simple query that doesn't use joins
      const invitationsWithGroups = await Promise.all(
        (invitations || []).map(async (invitation) => {
          // Try to get group details - this might fail due to RLS, so we'll handle it gracefully
          try {
            const { data: groupData } = await supabase
              .from('groups')
              .select('id, name, created_by, created_at')
              .eq('id', invitation.group_id)
              .single()

            return {
              ...invitation,
              groups: groupData ? [groupData] : []
            }
          } catch {
            console.log('Could not fetch group details for invitation:', invitation.group_id)
            return {
              ...invitation,
              groups: []
            }
          }
        })
      )

      setPendingInvitations(invitationsWithGroups)

      // Step 6: Combine created groups and member groups
      const allGroups = [...(createdGroups || []), ...memberGroups]
      
      // Remove duplicates (in case user is both creator and member)
      const uniqueGroups = allGroups.filter((group, index, self) => 
        index === self.findIndex((g) => g.id === group.id)
      )

      // Step 7: Get all members for each group with their emails
      const groupsWithMembers = await Promise.all(
        uniqueGroups.map(async (group) => {
          try {
            // Get basic member info
            const { data: members, error: membersError } = await supabase
              .from('group_members')
              .select('id, user_id, joined_at')
              .eq('group_id', group.id)

            if (membersError) {
              console.log('⚠️ Could not fetch members for group:', group.id, membersError.message)
              return {
                ...group,
                members: []
              }
            }

            // Get emails for each member (will use real emails from group.member_emails)
            const membersWithEmails = (members || []).map((member) => ({
              ...member,
              user_email: member.user_id === user.id ? user.email : 'Email no disponible'
            }))

            return {
              ...group,
              members: membersWithEmails
            }
          } catch (error) {
            console.log('⚠️ Error fetching members for group:', group.id, error)
            return {
              ...group,
              members: []
            }
          }
        })
      )

      console.log('📊 Final groups to display:', groupsWithMembers)
      setGroups(groupsWithMembers)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error fetching groups:', errorMessage)
      toast.error('Error al cargar grupos')
    } finally {
      setLoading(false)
    }
  }

  const handleInvitationResponse = async (invitationId: string, groupId: string, response: 'accepted' | 'rejected') => {
    if (!user) return

    console.log('🎯 Handling invitation response:', { invitationId, groupId, response })

    try {
      // Update invitation status
      const { error: inviteError } = await supabase
        .from('group_invitations')
        .update({ 
          status: response,
          responded_at: new Date().toISOString(),
          invited_user_id: user.id
        })
        .eq('id', invitationId)

      console.log('📝 Update invitation result:', { inviteError })

      if (inviteError) throw inviteError

      if (response === 'accepted') {
        // Add user to group members
        const { error: memberError } = await supabase
          .from('group_members')
          .insert([{
            group_id: groupId,
            user_id: user.id,
          }])

        console.log('👥 Add member result:', { memberError })

        if (memberError) throw memberError
        toast.success('Te has unido al grupo exitosamente')
      } else {
        toast.success('Invitación rechazada')
      }

      // Remove invitation from pending list
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      
      // Refresh groups to show the new group if accepted
      await fetchGroups()
      
      console.log('✅ Invitation response handled successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error responding to invitation:', errorMessage)
      toast.error('Error al responder la invitación: ' + errorMessage)
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error leaving group:', errorMessage)
      toast.error('Error al salir del grupo: ' + errorMessage)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
                  onClick={() => router.push('/dashboard')}
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
            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invitaciones Pendientes</h3>
                <div className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-blue-100 rounded-full p-2">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              Invitación a &quot;{(() => {
                                const groups = invitation.groups as unknown
                                if (Array.isArray(groups) && groups.length > 0) {
                                  return groups[0]?.name || 'Grupo'
                                } else if (groups && typeof groups === 'object' && 'name' in groups) {
                                  return (groups as { name: string }).name || 'Grupo'
                                }
                                return 'Grupo'
                              })()}&quot;
                            </h4>
                            <p className="text-sm text-gray-600">
                              Te han invitado a unirte a este grupo
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleInvitationResponse(
                              invitation.id,
                              invitation.group_id,
                              'accepted'
                            )}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleInvitationResponse(
                              invitation.id,
                              invitation.group_id,
                              'rejected'
                            )}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Groups Section */}
            {groups.length === 0 && pendingInvitations.length === 0 ? (
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
            ) : groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/groups/${group.id}`)}
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
            ) : null}
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