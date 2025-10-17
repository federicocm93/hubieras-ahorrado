'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import AddExpenseModal from './AddExpenseModal'
import AddCategoryModal from './AddCategoryModal'
import LoadingOverlay from './LoadingOverlay'
import TopBar from './TopBar'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useExpensesStore } from '@/stores/expensesStore'
import { useDataSync } from '@/hooks/useDataSync'
import { Expense, Group } from '@/stores/types'
import { DEFAULT_CURRENCY } from '@/utils/currencies'
import { useGroupTotalsStore } from '@/stores/groupTotalsStore'
import SummaryCard from './cards/SummaryCard'
import CategoryDistributionCard from './cards/CategoryDistributionCard'
import MonthlyExpensesCard from './cards/MonthlyExpensesCard'
import RecentExpenses from './RecentExpenses'
import CategoriesCard from './cards/CategoriesCard'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()

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
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY)
  const [userGroups, setUserGroups] = useState<Group[]>([])

  // Simple loading state - show loading while auth is loading or data is syncing
  const loading = authLoading || dataLoading

  // Fetch user's groups
  const fetchUserGroups = useCallback(async () => {
    if (!user) return

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-user-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setUserGroups(data.groups || [])
    } catch (error) {
      console.error('Error fetching user groups:', error)
      // Silently fail - group selector is optional
    }
  }, [user])

  // Initialize data when user is available
  useEffect(() => {
    if (user) {
      fetchUserGroups()
    }
  }, [user, fetchUserGroups])

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
    <div className="min-h-screen transition-colors" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <TopBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors">
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
          availableGroups={userGroups}
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
          availableGroups={userGroups}
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

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={loading} />
    </div>
  )
}
