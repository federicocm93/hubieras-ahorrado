'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Edit3, Trash2, DollarSign, Users, ArrowLeft, TrendingUp, BarChart3, Home } from 'lucide-react'
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
import { useTheme } from '@/contexts/ThemeContext'

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
  const router = useRouter()
  const { theme } = useTheme()
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
  const isDarkMode = theme === 'dark'

  const themedPageStyle = useMemo(() => ({ background: 'var(--background)', color: 'var(--foreground)' }), [])
  const themedCardStyle = useMemo(() => ({ background: 'var(--surface)', color: 'var(--foreground)' }), [])

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
    if (balance > 0) return 'text-green-600 dark:text-green-400'
    if (balance < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-900 dark:text-slate-100'
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
        borderColor: colors.slice(0, Object.keys(categoryTotals).length).map(color => color.replace('0.8', '1')),
        borderWidth: 2,
        hoverOffset: 4
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
        backgroundColor: isDarkMode ? 'rgba(79, 70, 229, 0.25)' : 'rgba(79, 70, 229, 0.1)',
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

  const chartPalette = useMemo(() => {
    const textColor = isDarkMode ? '#e2e8f0' : '#1f2937'
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.25)' : 'rgba(209, 213, 219, 0.5)'
    const tooltipBackground = isDarkMode ? '#0f172a' : '#ffffff'
    const tooltipBorder = isDarkMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(107, 114, 128, 0.2)'

    return { textColor, gridColor, tooltipBackground, tooltipBorder }
  }, [isDarkMode])

  const pieOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 11
          },
          boxWidth: 12,
          boxHeight: 12,
          color: chartPalette.textColor,
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : chartPalette.tooltipBackground,
        titleColor: chartPalette.textColor,
        bodyColor: chartPalette.textColor,
        borderColor: chartPalette.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          label: function(context: { label?: string; parsed?: number; dataset: { data: number[] } }) {
            const label = context.label || ''
            const value = context.parsed || 0
            const dataset = context.dataset
            const total = dataset.data.reduce((sum: number, amount: number) => sum + amount, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: selectedCurrency }).format(value)} (${percentage}%)`
          }
        }
      },
    },
  }), [chartPalette, isDarkMode, selectedCurrency])

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: chartPalette.textColor,
        },
      },
      tooltip: {
        backgroundColor: chartPalette.tooltipBackground,
        titleColor: chartPalette.textColor,
        bodyColor: chartPalette.textColor,
        borderColor: chartPalette.tooltipBorder,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: chartPalette.textColor },
        grid: { color: chartPalette.gridColor },
      },
      y: {
        ticks: { color: chartPalette.textColor },
        grid: { color: chartPalette.gridColor },
      },
    },
  }), [chartPalette])


  return (
    <div className="min-h-screen py-4 sm:py-8 transition-colors" style={themedPageStyle}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 transition-colors">
        {/* Header Card */}
        <div className="rounded-lg shadow mb-4 sm:mb-8 transition-colors" style={themedCardStyle}>
          <div className="px-4 sm:px-6 py-4 transition-colors">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center">
                <button
                  onClick={onBack}
                  onMouseEnter={() => prefetchGroups()}
                  className="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Volver a Mis Grupos"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Ir al Dashboard"
                >
                  <Home className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center transition-colors">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400 mr-2 sm:mr-3 transition-colors" />
                    {group.name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    {currentGroupMembers.length} miembro{currentGroupMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                {availableCurrencies.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap transition-colors">Moneda:</span>
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
                  className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-400 flex items-center justify-center transition-colors"
                >
                  Agregar Gasto
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Balances Card */}
        <div className="rounded-lg shadow mb-4 sm:mb-8 p-4 sm:p-6 transition-colors" style={themedCardStyle}>
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4 transition-colors">Balances</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentGroupMembers.map(member => (
              <div key={member.user_id} className="p-4 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors" style={themedCardStyle}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate transition-colors">
                      {getMemberEmail(member.user_id)}
                      {member.user_id === user?.id && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 transition-colors">(Tú)</span>
                      )}
                    </p>
                    <p className={`text-lg font-bold ${getBalanceColor(currencySpecificBalances[member.user_id] || 0)}`}>
                      {formatCurrency(currencySpecificBalances[member.user_id] || 0, selectedCurrency)}
                    </p>
                  </div>
                  <DollarSign className={`h-6 w-6 flex-shrink-0 ml-2 ${getBalanceColor(currencySpecificBalances[member.user_id] || 0)}`} />
                </div>
                {currencySpecificBalances[member.user_id] > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 transition-colors">Le deben dinero</p>
                )}
                {currencySpecificBalances[member.user_id] < 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 transition-colors">Debe dinero</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Card */}
        {filteredExpenses.length > 0 && (
          <div className="rounded-lg shadow mb-4 sm:mb-8 p-4 sm:p-6 transition-colors" style={themedCardStyle}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-6 flex items-center transition-colors">
              <BarChart3 className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400 transition-colors" />
              Análisis de Gastos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Category Pie Chart */}
              <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors" style={themedCardStyle}>
                <h4 className="text-md font-medium text-gray-900 dark:text-slate-100 mb-4 transition-colors">Gastos por Categoría</h4>
                <div className="h-96">
                  {categoryData.labels.length > 0 ? (
                    <Pie data={categoryData} options={pieOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 transition-colors">
                      No hay datos para mostrar
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors" style={themedCardStyle}>
                <h4 className="text-md font-medium text-gray-900 dark:text-slate-100 mb-4 transition-colors">Tendencia Mensual</h4>
                <div className="h-96">
                  {monthlyData.labels.length > 0 ? (
                    <Line data={monthlyData} options={lineOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 transition-colors">
                      No hay datos para mostrar
                    </div>
                  )}
                </div>
              </div>

              {/* Top Spender This Month */}
              <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors md:col-span-2 xl:col-span-1" style={themedCardStyle}>
                <h4 className="text-md font-medium text-gray-900 dark:text-slate-100 mb-4 flex items-center transition-colors">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600 dark:text-green-400 transition-colors" />
                  Mayor Gasto del Mes
                </h4>
                <div className="flex flex-col items-center justify-center h-40 sm:h-48">
                  {topSpender.amount > 0 ? (
                    <div className="flex flex-col items-center text-center w-full">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-3 mx-auto">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 px-2 w-full transition-colors">
                        {topSpender.email}
                        {topSpender.isCurrentUser && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 block transition-colors">(Tú)</span>
                        )}
                      </p>
                      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-2 transition-colors">
                        {formatCurrency(topSpender.amount, selectedCurrency)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                        Total gastado este mes
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center text-gray-500 dark:text-gray-400 transition-colors">
                      <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 mb-3 text-gray-400 dark:text-gray-500 transition-colors" />
                      <p className="text-sm transition-colors">No hay gastos este mes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses List Card */}
        <div className="rounded-lg shadow p-4 sm:p-6 transition-colors" style={themedCardStyle}>
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4 transition-colors">Gastos Compartidos</h3>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 transition-colors">
              <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 transition-colors" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-slate-100 transition-colors">No hay gastos compartidos</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 px-4 transition-colors">
                {expenses.length === 0
                  ? "Comienza agregando un gasto compartido para el grupo."
                  : `No hay gastos en ${selectedCurrency}. Selecciona otra moneda o agrega un gasto.`
                }
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
                >
                  Agregar Gasto
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 transition-colors" style={themedCardStyle}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-slate-100 truncate pr-2 transition-colors">
                          {expense.description}
                        </h4>
                        <span className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1 sm:mt-0 transition-colors">
                          {formatCurrency(expense.amount, expense.currency)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 gap-2 transition-colors">
                        <span className="bg-gray-100 dark:bg-slate-800 dark:text-gray-200 rounded-full px-2 py-1 text-xs transition-colors">
                          {expense.category.name}
                        </span>
                        <span className="hidden sm:inline transition-colors">•</span>
                        <span className="transition-colors">{(() => {
                          const [year, month, day] = expense.date.split('T')[0].split('-')
                          return `${day}/${month}/${year}`
                        })()}</span>
                        <span className="hidden sm:inline transition-colors">•</span>
                        <span className="break-all transition-colors">Pagado por: {expense.paid_by_email}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        {formatCurrency(expense.amount / currentGroupMembers.length, expense.currency)} por persona
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 mt-3 sm:mt-0 sm:ml-4 self-start">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 transition-colors"
                        title="Editar gasto"
                      >
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 transition-colors"
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
