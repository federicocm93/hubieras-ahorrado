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
      <header className="border-b border-gray-200/60 dark:border-slate-800 transition-colors" style={{ background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex justify-start">
              <Image
                src="/hubieras-ahorrado.svg"
                alt="Logo"
                width={400}
                height={100}
                className="h-[44px] w-[160px] sm:h-[70px] sm:w-[280px] lg:h-[90px] lg:w-[360px]"
              />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:block text-xs sm:text-sm text-gray-500 dark:text-gray-500 text-center truncate max-w-full transition-colors">
                Bienvenido, {user?.email}
              </span>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={toggleTheme}
                  className="icon-lift relative text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2"
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
                  className="icon-lift relative text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2"
                  title="Notificaciones"
                >
                  <Bell className="h-6 w-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-badge-bounce font-bold">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => router.push('/groups')}
                  onMouseEnter={() => prefetchGroups()}
                  className="icon-lift text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2"
                  title="Mis Grupos"
                >
                  <Users className="h-6 w-6" />
                </button>
                <button
                  onClick={signOut}
                  className="icon-lift flex items-center space-x-2 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="hidden md:inline text-sm">Cerrar sesión</span>
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
