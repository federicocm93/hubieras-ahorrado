'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LogOut, Bell, Users } from 'lucide-react'
import AddExpenseModal from './AddExpenseModal'
import AddCategoryModal from './AddCategoryModal'
import NotificationsPanel from './NotificationsPanel'
import LoadingOverlay from './LoadingOverlay'
import Image from 'next/image'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useExpensesStore } from '@/stores/expensesStore'
import { useDataSync } from '@/hooks/useDataSync'
import { Expense } from '@/stores/types'
import { usePrefetch } from '@/hooks/usePrefetch'
import { DEFAULT_CURRENCY } from '@/utils/currencies'
import { useGroupTotalsStore } from '@/stores/groupTotalsStore'
import SummaryCard from './cards/SummaryCard'
import CategoryDistributionCard from './cards/CategoryDistributionCard'
import MonthlyExpensesCard from './MonthlyExpensesCard'
import RecentExpenses from './RecentExpenses'
import CategoriesCard from './cards/CategoriesCard'

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Coordinated data synchronization
  const { isLoading: dataLoading, syncData } = useDataSync()
  
  // Zustand stores  
  const { 
    categories, 
    deleteCategory: deleteCategoryFromStore 
  } = useCategoriesStore()
  const { 
    expenses, 
    deleteExpense: deleteExpenseFromStore,
    getTotalExpensesByDate,
    getMostExpensiveCategoryByDate,
    getAvailableCurrencies
  } = useExpensesStore()
  
  // Local state
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY)
  
  // Prefetch hook
  const { prefetchGroups } = usePrefetch()
  
  // Simple loading state - show loading while auth is loading or data is syncing
  const loading = authLoading || dataLoading
  

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
  }, [user?.id])

  // Initialize data and notifications when user is available
  useEffect(() => {
    if (user) {
      fetchUnreadNotificationsCount()
    }
  }, [user, fetchUnreadNotificationsCount])

  const deleteExpense = async (id: string) => {
    try {
      await deleteExpenseFromStore(id)
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      await deleteCategoryFromStore(id)
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const currentMonthExpenses = getTotalExpensesByDate(currentMonth, currentYear, selectedCurrency)
  const currentDate = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
  
  const currentMonthMostExpensiveCategory = getMostExpensiveCategoryByDate(currentMonth, currentYear, selectedCurrency)
  
  const availableCurrencies = getAvailableCurrencies()
  const monthlyTotalsByCurrency = availableCurrencies.map(currency => ({
    currency,
    total: getTotalExpensesByDate(currentMonth, currentYear, currency)
  }))
  const filteredExpenses = expenses.filter(expense => expense.currency === selectedCurrency)
  
  // Auto-select the first available currency if user has expenses but selected currency has no expenses
  useEffect(() => {
    if (availableCurrencies.length > 0 && filteredExpenses.length === 0) {
      setSelectedCurrency(availableCurrencies[0])
    }
  }, [availableCurrencies, filteredExpenses.length])

  // Get group totals from store
  const { 
    groupTotals, 
    loading: groupTotalsLoading, 
    fetchGroupTotals 
  } = useGroupTotalsStore()

  // Track if initial fetch has been done for this user/currency combination
  const initialFetchDone = useRef(false)
  const currentFetchKey = useRef<string | null>(null)

  // Fetch group totals when user or currency changes
  useEffect(() => {
    if (user?.id) {
      const fetchKey = `${user.id}-${currentMonth}-${currentYear}-${selectedCurrency}`
      
      // Only fetch if this is a new combination or we haven't fetched yet
      if (!initialFetchDone.current || currentFetchKey.current !== fetchKey) {
        initialFetchDone.current = true
        currentFetchKey.current = fetchKey
        fetchGroupTotals(user.id, currentMonth, currentYear, selectedCurrency)
      }
    }
  }, [user?.id, selectedCurrency, fetchGroupTotals, currentMonth, currentYear])




  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
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
              <span className="hidden sm:block text-xs sm:text-sm text-gray-500 text-center truncate max-w-full">
                👋 Bienvenido, {user?.email}
              </span>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative text-gray-500 hover:text-gray-700 p-2"
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
                  className="text-gray-500 hover:text-gray-700 p-2"
                  title="Mis Grupos"
                >
                  <Users className="h-6 w-6" />
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 p-2"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Summary Card */}
          <SummaryCard
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            availableCurrencies={availableCurrencies}
            currentMonthExpenses={currentMonthExpenses}
            currentDate={currentDate}
            monthlyTotalsByCurrency={monthlyTotalsByCurrency}
            groupTotals={groupTotals}
            groupTotalsLoading={groupTotalsLoading}
            mostExpensiveCategory={currentMonthMostExpensiveCategory}
            onAddExpense={() => setShowAddExpense(true)}
            onAddCategory={() => setShowAddCategory(true)}
          />
          <CategoryDistributionCard
            expenses={filteredExpenses}
            currency={selectedCurrency}
          />
          <MonthlyExpensesCard
            expenses={filteredExpenses}
            currency={selectedCurrency}
          />
        </div>

        <RecentExpenses
          expenses={expenses}
          onEditExpense={(expense) => setEditingExpense(expense)}
          onDeleteExpense={deleteExpense}
        />

        <CategoriesCard
          categories={categories}
          onDeleteCategory={deleteCategory}
        />
      </main>

      {/* Modals */}
      {showAddExpense && (
        <AddExpenseModal
          categories={categories}
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            setShowAddExpense(false)
            syncData(true) // Force refresh after adding expense
          }}
        />
      )}

      {editingExpense && (
        <AddExpenseModal
          categories={categories}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null)
            syncData(true) // Force refresh after editing expense
          }}
        />
      )}

      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onSuccess={() => {
            setShowAddCategory(false)
            syncData(true) // Force refresh after adding category
          }}
        />
      )}

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false)
          fetchUnreadNotificationsCount()
        }}
      />

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={loading} />
    </div>
  )
}
