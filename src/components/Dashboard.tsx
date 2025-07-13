'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, LogOut, Edit2, Trash2, Bell, Users } from 'lucide-react'
import ExpenseChart from './ExpenseChart'
import AddExpenseModal from './AddExpenseModal'
import AddCategoryModal from './AddCategoryModal'
import NotificationsPanel from './NotificationsPanel'
import LoadingOverlay from './LoadingOverlay'
import CategoryPieChart from './CategoryPieChart'
import Image from 'next/image'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useExpensesStore } from '@/stores/expensesStore'
import { useDataSync } from '@/hooks/useDataSync'
import { Expense } from '@/stores/types'
import { usePrefetch } from '@/hooks/usePrefetch'
import { formatCurrency, DEFAULT_CURRENCY } from '@/utils/currencies'
import CustomSelect from '@/components/ui/CustomSelect'

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

  const currentMonthExpenses = getTotalExpensesByDate(new Date().getMonth(), new Date().getFullYear(), selectedCurrency)
  const currentDate = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
  
  const currentMonthMostExpensiveCategory = getMostExpensiveCategoryByDate(new Date().getMonth(), new Date().getFullYear(), selectedCurrency)
  
  const availableCurrencies = getAvailableCurrencies()
  const filteredExpenses = expenses.filter(expense => expense.currency === selectedCurrency)
  
  // Auto-select the first available currency if user has expenses but selected currency has no expenses
  useEffect(() => {
    if (availableCurrencies.length > 0 && filteredExpenses.length === 0) {
      setSelectedCurrency(availableCurrencies[0])
    }
  }, [availableCurrencies, filteredExpenses.length])




  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center flex-col sm:flex-row">
            <Image src="/logo.png" alt="Logo" width={400} height={100} className="h-[100px] w-[400px]" />
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">👋 Bienvenido, {user?.email}</span>
              <button
                onClick={() => setShowNotifications(true)}
                className="relative text-gray-500 hover:text-gray-700"
              >
                <Bell className="h-6 w-6" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/groups')}
                onMouseEnter={() => prefetchGroups()}
                className="text-gray-500 hover:text-gray-700"
                title="Mis Grupos"
              >
                <Users className="h-6 w-6" />
              </button>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">📊 Resumen mensual</h2>
              {availableCurrencies.length > 0 && (
                <div className="w-28">
                  <CustomSelect
                    value={selectedCurrency}
                    onChange={setSelectedCurrency}
                    options={availableCurrencies.map(currency => ({ 
                      value: currency, 
                      label: currency 
                    }))}
                    placeholder="Seleccionar moneda"
                  />
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-indigo-600">
              {formatCurrency(currentMonthExpenses, selectedCurrency)}
            </div>
            <p className="text-sm text-gray-500 mt-2">{currentDate}</p>
            
            {currentMonthMostExpensiveCategory && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">🔥 Categoría con más gastos</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-lg font-semibold text-gray-900">{currentMonthMostExpensiveCategory.category}</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(currentMonthMostExpensiveCategory.amount, selectedCurrency)}</span>
                </div>
              </div>
            )}
            
            {/* Quick Actions moved from middle section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-3">⚡ Acciones Rápidas</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>💸 Agregar Gasto</span>
                </button>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>📝 Agregar Categoría</span>
                </button>
              </div>
            </div>
          </div>

          {/* Category Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Distribución por Categoría</h2>
            <CategoryPieChart 
              expenses={filteredExpenses} 
              month={new Date().getMonth()} 
              year={new Date().getFullYear()} 
              currency={selectedCurrency}
            />
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Gastos Mensuales</h2>
            <ExpenseChart expenses={filteredExpenses} currency={selectedCurrency} />
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">📋 Gastos Recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moneda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const [year, month, day] = expense.date.split('T')[0].split('-')
                        return `${day}/${month}/${year}`
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.categories.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">🏷️ Categorías</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  {!category.is_default && (
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
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