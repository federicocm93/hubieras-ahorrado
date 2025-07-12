'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Plus, Edit3, Trash2, DollarSign, Users, ArrowLeft } from 'lucide-react'
import AddExpenseModal from './AddExpenseModal'
import LoadingOverlay from './LoadingOverlay'
import toast from 'react-hot-toast'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { usePrefetch } from '@/hooks/usePrefetch'

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
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [currentGroupMembers, setCurrentGroupMembers] = useState<GroupMember[]>([])
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
      setBalances(data.balances || {})
      
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
  }, [user, group, fetchSharedExpensesData, fetchCategories])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
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
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Users className="h-8 w-8 text-indigo-600 mr-3" />
                    {group.name}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {currentGroupMembers.length} miembro{currentGroupMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddExpense(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Agregar Gasto
              </button>
            </div>
          </div>

          {/* Balances Section */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Balances</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentGroupMembers.map(member => (
                <div key={member.user_id} className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getMemberEmail(member.user_id)}
                        {member.user_id === user?.id && (
                          <span className="text-xs text-gray-500 ml-1">(Tú)</span>
                        )}
                      </p>
                      <p className={`text-lg font-bold ${getBalanceColor(balances[member.user_id] || 0)}`}>
                        {formatCurrency(balances[member.user_id] || 0)}
                      </p>
                    </div>
                    <DollarSign className={`h-6 w-6 ${getBalanceColor(balances[member.user_id] || 0)}`} />
                  </div>
                  {balances[member.user_id] > 0 && (
                    <p className="text-xs text-green-600 mt-1">Le deben dinero</p>
                  )}
                  {balances[member.user_id] < 0 && (
                    <p className="text-xs text-red-600 mt-1">Debe dinero</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Expenses List */}
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gastos Compartidos</h3>
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay gastos compartidos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comienza agregando un gasto compartido para el grupo.
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
                {expenses.map((expense) => (
                  <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-medium text-gray-900">
                            {expense.description}
                          </h4>
                          <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="bg-gray-100 rounded-full px-2 py-1 text-xs">
                            {expense.category.name}
                          </span>
                          <span className="mx-2">•</span>
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Pagado por: {expense.paid_by_email}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {formatCurrency(expense.amount / currentGroupMembers.length)} por persona
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-900"
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