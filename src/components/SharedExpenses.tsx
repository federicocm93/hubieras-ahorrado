'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Plus, Edit3, Trash2, DollarSign, Users, ArrowLeft } from 'lucide-react'
import AddExpenseModal from './AddExpenseModal'
import toast from 'react-hot-toast'

interface Group {
  id: string
  name: string
  created_by: string
  created_at: string
  members: GroupMember[]
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

interface Category {
  id: string
  name: string
}

interface SharedExpensesProps {
  group: Group
  onBack: () => void
}

export default function SharedExpenses({ group, onBack }: SharedExpensesProps) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [currentGroupMembers, setCurrentGroupMembers] = useState<GroupMember[]>(group.members)

  useEffect(() => {
    if (user && group) {
      fetchGroupMembers()
      fetchSharedExpenses()
      fetchCategories()
    }
  }, [user, group])

  useEffect(() => {
    calculateBalances()
  }, [expenses, currentGroupMembers])

  const fetchGroupMembers = async () => {
    if (!user) return

    try {
      // Use the database function to get group members with their real emails
      const { data: membersWithEmails, error: membersError } = await supabase
        .rpc('get_group_members_with_emails', { group_id_param: group.id })

      if (membersError) {
        console.log('⚠️ Could not fetch members with emails for group:', group.id, membersError.message)
        // Fallback to the prop data
        setCurrentGroupMembers(group.members)
        return
      }

      console.log('✅ Successfully fetched group members with emails:', membersWithEmails)
      setCurrentGroupMembers(membersWithEmails || group.members)
    } catch (error) {
      console.log('⚠️ Error fetching group members:', error)
      // Fallback to the prop data
      setCurrentGroupMembers(group.members)
    }
  }

  const fetchSharedExpenses = async () => {
    if (!user) return

    console.log('🔍 Fetching shared expenses for group:', group.id)
    console.log('👥 Group members:', currentGroupMembers)

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq('group_id', group.id)
        .order('date', { ascending: false })

      console.log('📊 Expenses query result:', { data, error })

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      if (!data) {
        console.log('✅ No expenses found')
        setExpenses([])
        return
      }

      console.log('💰 Raw expenses data:', data)

      // Get user emails for paid_by field
      const expensesWithEmails = await Promise.all(
        data.map(async (expense) => {
          console.log('Processing expense:', expense)
          
          // Try to get user email from the database
          let userEmail = 'Usuario desconocido'
          
          try {
            const { data: userEmailData, error: userEmailError } = await supabase
              .rpc('get_user_email_for_expense', { user_id_param: expense.paid_by })
            
                         if (userEmailError) {
               console.log('⚠️ Could not fetch user email via RPC:', userEmailError.message)
               // Fallback to group members data
               const member = currentGroupMembers.find(m => m.user_id === expense.paid_by)
               userEmail = member?.user_email || 'Usuario desconocido'
             } else {
               userEmail = userEmailData || 'Usuario desconocido'
             }
           } catch (error) {
             console.log('⚠️ Error fetching user email:', error)
             // Fallback to group members data
             const member = currentGroupMembers.find(m => m.user_id === expense.paid_by)
             userEmail = member?.user_email || 'Usuario desconocido'
           }
          
          const processedExpense = {
            ...expense,
            paid_by_email: userEmail,
            category: expense.category || { id: '', name: 'Sin categoría' }
          }
          
          console.log('Processed expense:', processedExpense)
          return processedExpense
        })
      )

      console.log('✅ Final expenses with emails:', expensesWithEmails)
      setExpenses(expensesWithEmails)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error fetching shared expenses:', errorMessage)
      console.error('Full error object:', error)
      toast.error('Error al cargar gastos compartidos: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error fetching categories:', errorMessage)
    }
  }

  const calculateBalances = () => {
    const memberBalances: Record<string, number> = {}
    
    // Initialize balances for all members
    currentGroupMembers.forEach(member => {
      memberBalances[member.user_id] = 0
    })

    // Calculate what each person paid vs what they owe
    expenses.forEach(expense => {
      const amountPerPerson = expense.amount / currentGroupMembers.length
      
      // Person who paid gets credit
      memberBalances[expense.paid_by] += expense.amount - amountPerPerson
      
      // Everyone else owes their share
      currentGroupMembers.forEach(member => {
        if (member.user_id !== expense.paid_by) {
          memberBalances[member.user_id] -= amountPerPerson
        }
      })
    })

    setBalances(memberBalances)
  }

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
    return new Intl.NumberFormat('en-US', {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
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
                  className="mr-4 text-gray-500 hover:text-gray-700"
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
            fetchSharedExpenses()
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
            paid_by: editingExpense.paid_by
          }}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null)
            fetchSharedExpenses()
          }}
          groupId={group.id}
          groupMembers={currentGroupMembers}
        />
      )}
    </div>
  )
}