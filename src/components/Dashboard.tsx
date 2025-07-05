'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, LogOut, Edit2, Trash2, Bell, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import ExpenseChart from './ExpenseChart'
import AddExpenseModal from './AddExpenseModal'
import AddCategoryModal from './AddCategoryModal'
import NotificationsPanel from './NotificationsPanel'
import Image from 'next/image'

interface Category {
  id: string
  name: string
  is_default: boolean
}

interface Expense {
  id: string
  amount: number
  description: string
  date: string
  category_id: string
  categories: {
    name: string
  }
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (user) {
      fetchExpenses()
      fetchCategories()
      fetchUnreadNotificationsCount()
    }
  }, [user])

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          name
        )
      `)
      .is('group_id', null)
      .order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching expenses:', error)
    } else {
      setExpenses(data || [])
    }
    setLoading(false)
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching categories:', error)
    } else {
      setCategories(data || [])
    }
  }

  const fetchUnreadNotificationsCount = async () => {
    if (!user) return
    
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
  }

  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting expense:', error)
    } else {
      fetchExpenses()
    }
  }

  const deleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id)
    if (category?.is_default) {
      toast.error('No se pueden eliminar las categorías predeterminadas')
      return
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting category:', error)
    } else {
      fetchCategories()
    }
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  const getMostExpensiveCategory = () => {
    const categoryTotals = expenses.reduce((acc, expense) => {
      const categoryName = expense.categories.name
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)
    
    if (Object.keys(categoryTotals).length === 0) return null
    
    const maxCategory = Object.entries(categoryTotals).reduce((max, [category, amount]) => 
      amount > max.amount ? { category, amount } : max
    , { category: '', amount: 0 })
    
    return maxCategory
  }
  
  const mostExpensiveCategory = getMostExpensiveCategory()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Image src="/logo.png" alt="Logo" width={200} height={50} className="h-[50px] w-[200px]" />
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
                className="text-gray-500 hover:text-gray-700"
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Resumen</h2>
            <div className="text-3xl font-bold text-indigo-600">
              ${totalExpenses.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500 mt-2">💰 Gastos totales</p>
            
            {mostExpensiveCategory && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">🔥 Categoría con más gastos</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-lg font-semibold text-gray-900">{mostExpensiveCategory.category}</span>
                  <span className="text-lg font-bold text-red-600">${mostExpensiveCategory.amount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Acciones Rápidas</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowAddExpense(true)}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                <span>💸 Agregar Gasto</span>
              </button>
              <button
                onClick={() => setShowAddCategory(true)}
                className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                <Plus className="h-4 w-4" />
                <span>📝 Agregar Categoría</span>
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Gastos Mensuales</h2>
            <ExpenseChart expenses={expenses} />
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
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.categories.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${expense.amount.toFixed(2)}
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
            fetchExpenses()
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
            fetchExpenses()
          }}
        />
      )}

      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onSuccess={() => {
            setShowAddCategory(false)
            fetchCategories()
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
    </div>
  )
}