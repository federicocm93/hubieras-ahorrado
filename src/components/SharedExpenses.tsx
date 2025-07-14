'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Plus, Edit3, Trash2, DollarSign, Users, ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react'
import AddExpenseModal from './AddExpenseModal'
import LoadingOverlay from './LoadingOverlay'
import toast from 'react-hot-toast'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { usePrefetch } from '@/hooks/usePrefetch'
import { formatCurrency as formatCurrencyUtil, DEFAULT_CURRENCY } from '@/utils/currencies'
import CustomSelect from '@/components/ui/CustomSelect'
import { Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface Group {
  id: string
  name: string
  created_by: string
  created_at: string
}

interface GroupMember {
  id: string
  user_id: string
  user_email?: string
  joined_at: string
}

interface SharedExpense {
  id: string
  amount: number
  description: string
  date: string
  paid_by: string
  paid_by_email?: string
  category: {
    id: string
    name: string
  }
  group_id: string
  currency: string
}


interface SharedExpensesProps {
  group: Group
  onBack: () => void
}

export default function SharedExpenses({ group, onBack }: SharedExpensesProps) {
  const { user } = useAuth()
  const { categories, fetchCategories } = useCategoriesStore()
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null)
  const [currentGroupMembers, setCurrentGroupMembers] = useState<GroupMember[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY)
  const initialFetchDone = useRef(false)
  const currentGroupId = useRef<string | null>(null)
  const { prefetchGroups } = usePrefetch()

  const fetchSharedExpensesData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-shared-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ group_id: group.id }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setCurrentGroupMembers(data.members || [])
      setExpenses(data.expenses || [])
      
      console.log('📊 Shared expenses data fetched via edge function:', data)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error fetching shared expenses:', errorMessage)
      toast.error('Error al cargar gastos compartidos: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, group.id])

  useEffect(() => {
    if (user && group) {
      // Only fetch if this is a new group or we haven't fetched yet
      if (!initialFetchDone.current || currentGroupId.current !== group.id) {
        initialFetchDone.current = true
        currentGroupId.current = group.id
        fetchSharedExpensesData()
        fetchCategories(user.id)
      }
    }
  }, [user?.id, group.id]) // Only depend on user.id and group.id to prevent infinite re-renders

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) return

    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('group_id', group.id)

      if (error) throw error

      setExpenses(prev => prev.filter(expense => expense.id !== expenseId))
      toast.success('Gasto eliminado exitosamente')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error deleting expense:', errorMessage)
      toast.error('Error al eliminar el gasto: ' + errorMessage)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return formatCurrencyUtil(amount, currency)
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600'
    if (balance < 0) return 'text-red-600'
    return 'text-gray-900'
  }

  const getMemberEmail = (userId: string) => {
    const member = currentGroupMembers.find(m => m.user_id === userId)
    return member?.user_email || 'Usuario desconocido'
  }

  // Get available currencies from expenses
  const getAvailableCurrencies = () => {
    const currencies = new Set(expenses.map(expense => expense.currency))
    return Array.from(currencies).sort()
  }

  // Filter expenses by selected currency
  const filteredExpenses = expenses.filter(expense => expense.currency === selectedCurrency)

  // Calculate balances for the selected currency only
  const getCurrencySpecificBalances = () => {
    const currencyBalances: Record<string, number> = {}
    
    // Initialize all members with 0 balance
    currentGroupMembers.forEach(member => {
      currencyBalances[member.user_id] = 0
    })

    // Calculate balances only for expenses in the selected currency
    filteredExpenses.forEach(expense => {
      const amountPerPerson = expense.amount / currentGroupMembers.length
      
      // The person who paid gets credited
      currencyBalances[expense.paid_by] += expense.amount - amountPerPerson
      
      // Everyone else gets debited
      currentGroupMembers.forEach(member => {
        if (member.user_id !== expense.paid_by) {
          currencyBalances[member.user_id] -= amountPerPerson
        }
      })
    })

    return currencyBalances
  }

  const availableCurrencies = getAvailableCurrencies()
  const currencySpecificBalances = getCurrencySpecificBalances()

  // Auto-select the first available currency if user has expenses but selected currency has no expenses
  useEffect(() => {
    if (availableCurrencies.length > 0 && filteredExpenses.length === 0) {
      setSelectedCurrency(availableCurrencies[0])
    }
  }, [availableCurrencies, filteredExpenses.length])

  // Chart data calculations
  const getCategoryData = () => {
    const categoryTotals: Record<string, number> = {}
    filteredExpenses.forEach(expense => {
      const category = expense.category.name
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount
    })

    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ]

    return {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: colors.slice(0, Object.keys(categoryTotals).length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }

  const getMonthlyData = () => {
    const monthlyTotals: Record<string, number> = {}
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount
    })

    const sortedMonths = Object.keys(monthlyTotals).sort()
    const labels = sortedMonths.map(month => {
      const [year, monthNum] = month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1)
      return date.toLocaleDateString('es', { month: 'short', year: 'numeric' })
    })

    return {
      labels,
      datasets: [{
        label: `Total Gastos (${selectedCurrency})`,
        data: sortedMonths.map(month => monthlyTotals[month]),
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.1,
        fill: true
      }]
    }
  }

  const getTopSpenderThisMonth = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    const monthlySpending: Record<string, number> = {}
    filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date)
      if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
        monthlySpending[expense.paid_by] = (monthlySpending[expense.paid_by] || 0) + expense.amount
      }
    })

    const topSpender = Object.entries(monthlySpending).reduce((max, [userId, amount]) => 
      amount > max.amount ? { userId, amount } : max
    , { userId: '', amount: 0 })

    return {
      email: getMemberEmail(topSpender.userId),
      amount: topSpender.amount,
      isCurrentUser: topSpender.userId === user?.id
    }
  }

  const categoryData = getCategoryData()
  const monthlyData = getMonthlyData()
  const topSpender = getTopSpenderThisMonth()

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  }


  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center">
                <button
                  onClick={onBack}
                  onMouseEnter={() => prefetchGroups()}
                  className="mr-4 text-gray-500 hover:text-gray-700"
                  title="Volver a Mis Grupos"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mr-2 sm:mr-3" />
                    {group.name}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {currentGroupMembers.length} miembro{currentGroupMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                {availableCurrencies.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Moneda:</span>
                    <div className="w-full sm:w-28">
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
                  </div>
                )}
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Gasto
                </button>
              </div>
            </div>
          </div>

          {/* Balances Section */}
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Balances</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentGroupMembers.map(member => (
                <div key={member.user_id} className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getMemberEmail(member.user_id)}
                        {member.user_id === user?.id && (
                          <span className="text-xs text-gray-500 ml-1">(Tú)</span>
                        )}
                      </p>
                      <p className={`text-lg font-bold ${getBalanceColor(currencySpecificBalances[member.user_id] || 0)}`}>
                        {formatCurrency(currencySpecificBalances[member.user_id] || 0, selectedCurrency)}
                      </p>
                    </div>
                    <DollarSign className={`h-6 w-6 flex-shrink-0 ml-2 ${getBalanceColor(currencySpecificBalances[member.user_id] || 0)}`} />
                  </div>
                  {currencySpecificBalances[member.user_id] > 0 && (
                    <p className="text-xs text-green-600 mt-1">Le deben dinero</p>
                  )}
                  {currencySpecificBalances[member.user_id] < 0 && (
                    <p className="text-xs text-red-600 mt-1">Debe dinero</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Section */}
          {filteredExpenses.length > 0 && (
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-indigo-600" />
                Análisis de Gastos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Category Pie Chart */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Gastos por Categoría</h4>
                  <div className="h-48 sm:h-64">
                    {categoryData.labels.length > 0 ? (
                      <Pie data={categoryData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No hay datos para mostrar
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Trend Chart */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Tendencia Mensual</h4>
                  <div className="h-48 sm:h-64">
                    {monthlyData.labels.length > 0 ? (
                      <Line data={monthlyData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No hay datos para mostrar
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Spender This Month */}
                <div className="bg-white p-4 rounded-lg border md:col-span-2 xl:col-span-1">
                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Mayor Gasto del Mes
                  </h4>
                  <div className="flex flex-col items-center justify-center h-40 sm:h-48">
                    {topSpender.amount > 0 ? (
                      <div className="flex flex-col items-center text-center w-full">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-3 mx-auto">
                          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 px-2 w-full">
                          {topSpender.email}
                          {topSpender.isCurrentUser && (
                            <span className="text-xs text-gray-500 block">(Tú)</span>
                          )}
                        </p>
                        <p className="text-lg font-bold text-indigo-600 mt-2">
                          {formatCurrency(topSpender.amount, selectedCurrency)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Total gastado este mes
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center text-gray-500">
                        <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 mb-3 text-gray-400" />
                        <p className="text-sm">No hay gastos este mes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expenses List */}
          <div className="px-4 sm:px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gastos Compartidos</h3>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay gastos compartidos</h3>
                <p className="mt-1 text-sm text-gray-500 px-4">
                  {expenses.length === 0 
                    ? "Comienza agregando un gasto compartido para el grupo."
                    : `No hay gastos en ${selectedCurrency}. Selecciona otra moneda o agrega un gasto.`
                  }
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Agregar Gasto
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                          <h4 className="text-lg font-medium text-gray-900 truncate pr-2">
                            {expense.description}
                          </h4>
                          <span className="text-xl font-bold text-gray-900 mt-1 sm:mt-0">
                            {formatCurrency(expense.amount, expense.currency)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500 gap-2">
                          <span className="bg-gray-100 rounded-full px-2 py-1 text-xs">
                            {expense.category.name}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>{(() => {
                            const [year, month, day] = expense.date.split('T')[0].split('-')
                            return `${day}/${month}/${year}`
                          })()}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="break-all">Pagado por: {expense.paid_by_email}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {formatCurrency(expense.amount / currentGroupMembers.length, expense.currency)} por persona
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 mt-3 sm:mt-0 sm:ml-4 self-start">
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Editar gasto"
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          categories={categories}
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            setShowAddExpense(false)
            fetchSharedExpensesData()
          }}
          groupId={group.id}
          groupMembers={currentGroupMembers}
        />
      )}

      {editingExpense && (
        <AddExpenseModal
          categories={categories}
          expense={{
            id: editingExpense.id,
            amount: editingExpense.amount,
            description: editingExpense.description,
            date: editingExpense.date,
            category_id: editingExpense.category.id,
            group_id: editingExpense.group_id,
            user_id: editingExpense.paid_by,
            currency: editingExpense.currency,
            created_at: editingExpense.date,
            categories: {
              name: editingExpense.category.name
            }
          }}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null)
            fetchSharedExpensesData()
          }}
          groupId={group.id}
          groupMembers={currentGroupMembers}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={loading} />
    </div>
  )
}