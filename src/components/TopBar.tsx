'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LogOut, Bell, Users, Moon, Sun } from 'lucide-react'
import NotificationsPanel from './NotificationsPanel'
import Image from 'next/image'
import { usePrefetch } from '@/hooks/usePrefetch'
import { useTheme } from '@/contexts/ThemeContext'

export default function TopBar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { prefetchGroups } = usePrefetch()

  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // Memoized notification fetch to prevent unnecessary re-renders
  const fetchUnreadNotificationsCount = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) {
        console.error('Error fetching notifications count:', error)
      } else {
        setUnreadNotifications(data?.length || 0)
      }
    } catch (error) {
      console.error('Unexpected error fetching notifications:', error)
    }
  }, [user])

  // Fetch unread notifications count when user is available
  useEffect(() => {
    if (user) {
      fetchUnreadNotificationsCount()
    }
  }, [user, fetchUnreadNotificationsCount])

  return (
    <>
      <header className="shadow-sm transition-colors" style={{ background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex justify-start">
              <Image
                src="/hubieras-ahorrado.svg"
                alt="Logo"
                width={400}
                height={100}
                className="h-[60px] w-[240px] sm:h-[80px] sm:w-[320px] lg:h-[100px] lg:w-[400px]"
              />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:block text-xs sm:text-sm text-gray-500 dark:text-gray-500 text-center truncate max-w-full transition-colors">
                Bienvenido, {user?.email}
              </span>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={toggleTheme}
                  className="relative text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-100 p-2 transition-colors"
                  title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  aria-pressed={theme === 'dark'}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-6 w-6" />
                  ) : (
                    <Moon className="h-6 w-6" />
                  )}
                </button>
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-100 p-2 transition-colors"
                  title="Notificaciones"
                >
                  <Bell className="h-6 w-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => router.push('/groups')}
                  onMouseEnter={() => prefetchGroups()}
                  className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-100 p-2 transition-colors"
                  title="Mis Grupos"
                >
                  <Users className="h-6 w-6" />
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-100 p-2 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false)
          fetchUnreadNotificationsCount()
        }}
      />
    </>
  )
}
