'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Bell, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  type: 'group_invitation' | 'expense_added' | 'payment_request'
  title: string
  message: string
  read: boolean
  data?: any
  created_at: string
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications()
    }
  }, [isOpen, user])

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message)
      toast.error('Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      )
    } catch (error: any) {
      console.error('Error marking notification as read:', error.message)
    }
  }

  const handleInvitationResponse = async (notificationId: string, response: 'accepted' | 'rejected', groupId: string) => {
    if (!user) return

    try {
      // Update invitation status
      const { error: inviteError } = await supabase
        .from('group_invitations')
        .update({ 
          status: response,
          responded_at: new Date().toISOString(),
          invited_user_id: user.id
        })
        .eq('group_id', groupId)
        .eq('invited_email', user.email)

      if (inviteError) throw inviteError

      if (response === 'accepted') {
        // Add user to group members
        const { error: memberError } = await supabase
          .from('group_members')
          .insert([{
            group_id: groupId,
            user_id: user.id,
          }])

        if (memberError) throw memberError
        toast.success('Te has unido al grupo exitosamente')
      } else {
        toast.success('Invitación rechazada')
      }

      // Mark notification as read
      await markAsRead(notificationId)

      // Remove notification from list
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      
    } catch (error: any) {
      console.error('Error responding to invitation:', error.message)
      toast.error('Error al responder la invitación: ' + error.message)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
    } catch (error: any) {
      console.error('Error deleting notification:', error.message)
      toast.error('Error al eliminar notificación')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return <Users className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return 'Hace un momento'
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full text-gray-900 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Notificaciones
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Bell className="h-12 w-12 mb-4 text-gray-300" />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg ${
                    notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>

                      {notification.type === 'group_invitation' && (
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => handleInvitationResponse(
                              notification.id,
                              'accepted',
                              notification.data?.group_id
                            )}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleInvitationResponse(
                              notification.id,
                              'rejected',
                              notification.data?.group_id
                            )}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}

                      {notification.read && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}