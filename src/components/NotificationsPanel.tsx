'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Bell, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface NotificationData {
  group_id?: string
  [key: string]: string | number | boolean | null | undefined
}

interface Notification {
  id: string
  type: 'group_invitation' | 'expense_added' | 'payment_request'
  title: string
  message: string
  read: boolean
  data?: NotificationData
  created_at: string
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { user, checkPendingInvitations } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && user) {
      // Check for pending invitations first, then fetch notifications
      checkPendingInvitations().then(() => {
        fetchNotifications()
      }).catch(error => {
        console.error('Error checking pending invitations:', error)
        fetchNotifications() // Still fetch notifications even if invitation check fails
      })
    }
  }, [isOpen, user, checkPendingInvitations])

  const fetchNotifications = async () => {
    if (!user) {
      return
    }

    setLoading(true)
    setError(null)
    
    // Create a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('Timeout: No se pudieron cargar las notificaciones')
    }, 10000) // 10 second timeout

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      clearTimeout(timeoutId)

      if (error) {
        throw error
      }

      setNotifications(data || [])
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Error fetching notifications:', error)
      setError('Error al cargar notificaciones')
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
    } catch (error) {
      console.error('Error marking notification as read:', error)
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
      
    } catch (error) {
      console.error('Error responding to invitation:', error)
      toast.error('Error al responder la invitación: ' + error)
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
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Error al eliminar notificación')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return <Users className="h-5 w-5 text-blue-500 dark:text-blue-400 transition-colors" />
      default:
        return <Bell className="h-5 w-5 text-gray-500 dark:text-gray-300 transition-colors" />
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
    <div className="fixed inset-0 bg-white/10 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full text-gray-900 dark:text-slate-100 max-h-[80vh] flex flex-col shadow-lg transition-colors">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-700 mx-2 transition-colors">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 transition-colors">
            Notificaciones
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-2 transition-colors">Cargando notificaciones...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 text-red-500">
              <Bell className="h-12 w-12 mb-4 text-red-300" />
              <p className="text-center text-gray-700 dark:text-gray-200 transition-colors">{error}</p>
              <button
                onClick={fetchNotifications}
                className="mt-4 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-300 transition-colors">
              <Bell className="h-12 w-12 mb-4 text-gray-300" />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    notification.read
                      ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                      : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/60'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 transition-colors">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 transition-colors">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-300 mt-2 transition-colors">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0 mt-2 transition-colors"></div>
                        )}
                      </div>

                      {notification.type === 'group_invitation' && (
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => handleInvitationResponse(
                              notification.id,
                              'accepted',
                              notification.data?.group_id || ''
                            )}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400 transition-colors"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleInvitationResponse(
                              notification.id,
                              'rejected',
                              notification.data?.group_id || ''
                            )}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 transition-colors"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}

                      {notification.read && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
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
