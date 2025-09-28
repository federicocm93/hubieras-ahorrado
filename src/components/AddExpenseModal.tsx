'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import CustomSelect from '@/components/ui/CustomSelect'
import { useExpensesStore } from '@/stores/expensesStore'
import { Category, Expense, GroupMember } from '@/stores/types'
import { CURRENCIES, DEFAULT_CURRENCY } from '@/utils/currencies'

interface AddExpenseModalProps {
  categories: Category[]
  expense?: Expense | null
  onClose: () => void
  onSuccess: () => void
  groupId?: string
  groupMembers?: GroupMember[]
}



export default function AddExpenseModal({ categories, expense, onClose, onSuccess, groupId, groupMembers }: AddExpenseModalProps) {
  const { user } = useAuth()
  const { addExpense, updateExpense } = useExpensesStore()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString().replace('.', ','))
      setDescription(expense.description)
      setCategoryId(expense.category_id)
      setDate(expense.date)
      setCurrency(expense.currency || DEFAULT_CURRENCY)
      setPaidBy((expense as { paid_by?: string }).paid_by || '')
    } else {
      setDate(new Date().toISOString().split('T')[0])
      setCurrency(DEFAULT_CURRENCY)
      setPaidBy(user?.id || '')
    }
  }, [expense, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Basic validation
    if (!amount.trim()) {
      toast.error('Por favor ingresa un monto')
      return
    }
    
    if (!description.trim()) {
      toast.error('Por favor ingresa una descripción')
      return
    }
    
    if (!categoryId) {
      toast.error('Por favor selecciona una categoría')
      return
    }

    setLoading(true)

    try {
      // Clean and parse the amount
      const cleanAmount = amount.trim().replace(',', '.')
      const parsedAmount = parseFloat(cleanAmount)
      
      console.log('Amount input:', amount, 'Cleaned:', cleanAmount, 'Parsed:', parsedAmount)
      
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error('Por favor ingresa un monto válido')
        setLoading(false)
        return
      }
      
      const expenseData = {
        amount: parsedAmount,
        description,
        category_id: categoryId,
        user_id: user.id,
        date,
        currency,
        group_id: groupId || null,
        ...(groupId && {
          paid_by: paidBy || user.id
        })
      }
      
      console.log('Expense data to save:', expenseData)

      if (expense) {
        // For personal expenses, use the store. For group expenses, use direct API
        if (!groupId) {
          await updateExpense(expense.id, expenseData)
        } else {
          const { error } = await supabase
            .from('expenses')
            .update(expenseData)
            .eq('id', expense.id)
          
          if (error) throw error
        }
      } else {
        // For personal expenses, use the store. For group expenses, use direct API
        if (!groupId) {
          await addExpense(expenseData)
        } else {
          const { error } = await supabase
            .from('expenses')
            .insert([expenseData])
          
          if (error) throw error
        }
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error('Error al guardar el gasto: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white/10 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full text-gray-900 dark:text-slate-100 shadow-lg transition-colors">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-700 mx-2 transition-colors">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 transition-colors">
            {expense ? 'Editar Gasto' : 'Agregar Nuevo Gasto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Monto
            </label>
            <input
              type="number"
              id="amount"
              required
              placeholder="0,00"
              className="mt-1 block w-full h-10 border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={amount}
              onChange={(e) => {
                let value = e.target.value
                
                // Remove all non-digit, non-comma, non-dot characters
                value = value.replace(/[^\d,\.]/g, '')
                
                // Convert dots to commas (in case user types dot)
                value = value.replace(/\./g, ',')
                
                // Allow only one comma
                const commaIndex = value.indexOf(',')
                if (commaIndex !== -1) {
                  value = value.substring(0, commaIndex + 1) + value.substring(commaIndex + 1).replace(/,/g, '')
                }
                
                setAmount(value)
              }}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Descripción
            </label>
            <input
              type="text"
              id="description"
              required
              className="mt-1 block w-full h-10 border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Categoría
            </label>
            <CustomSelect
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map(category => ({ value: category.id, label: category.name }))}
              placeholder="Selecciona una categoría"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Moneda
            </label>
            <CustomSelect
              value={currency}
              onChange={setCurrency}
              options={CURRENCIES.map(curr => ({ 
                value: curr.code, 
                label: `${curr.symbol} ${curr.code} - ${curr.name}` 
              }))}
              placeholder="Selecciona una moneda"
            />
          </div>

          {groupId && groupMembers && (
            <div>
              <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                Pagado por
              </label>
              <CustomSelect
                value={paidBy}
                onChange={setPaidBy}
                options={groupMembers.map(member => ({ 
                  value: member.user_id, 
                  label: `${member.user_email || 'Usuario desconocido'}${member.user_id === user?.id ? ' (Tú)' : ''}` 
                }))}
                placeholder="Selecciona quién pagó"
              />
            </div>
          )}

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Fecha
            </label>
            <input
              type="date"
              id="date"
              required
              className="mt-1 block w-full h-10 border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800 transition-colors">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : expense ? 'Actualizar Gasto' : 'Agregar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
