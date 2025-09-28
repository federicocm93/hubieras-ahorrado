'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import CustomSelect from '@/components/ui/CustomSelect'
import AmountInput, { formatAmountValue } from '@/components/ui/AmountInput'
import { useExpensesStore } from '@/stores/expensesStore'
import { Category, Expense, GroupMember } from '@/stores/types'
import { CURRENCIES, DEFAULT_CURRENCY } from '@/utils/currencies'
import { useTheme } from '@/contexts/ThemeContext'

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
  const [amountValue, setAmountValue] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const subtleBorderColor = useMemo(() => theme === 'dark' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.2)', [theme])
  const overlayStyle = useMemo(() => ({
    backgroundColor: theme === 'dark' ? 'rgba(2, 6, 23, 0.85)' : 'rgba(15, 23, 42, 0.12)',
    color: 'var(--foreground)'
  }), [theme])
  const modalStyle = useMemo(() => ({ background: 'var(--surface)', color: 'var(--foreground)' }), [])
  const headerStyle = useMemo(() => ({ background: 'var(--background)', borderColor: subtleBorderColor }), [subtleBorderColor])
  const dividerStyle = useMemo(() => ({ borderColor: subtleBorderColor }), [subtleBorderColor])
  const inputStyle = useMemo(() => ({
    background: 'var(--background)',
    color: 'var(--foreground)',
    borderColor: subtleBorderColor
  }), [subtleBorderColor])

  useEffect(() => {
    if (expense) {
      setAmount(formatAmountValue(expense.amount, { allowDecimals: true, maxFractionDigits: 2 }))
      setAmountValue(expense.amount)
      setDescription(expense.description)
      setCategoryId(expense.category_id)
      setDate(expense.date)
      setCurrency(expense.currency || DEFAULT_CURRENCY)
      setPaidBy((expense as { paid_by?: string }).paid_by || '')
    } else {
      setAmount('')
      setAmountValue(null)
      setDate(new Date().toISOString().split('T')[0])
      setCurrency(DEFAULT_CURRENCY)
      setPaidBy(user?.id || '')
    }
  }, [expense, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Basic validation
    if (amountValue === null) {
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
      // Validate parsed amount
      console.log('Amount input:', amount, 'Parsed:', amountValue)

      if (isNaN(amountValue) || amountValue <= 0) {
        toast.error('Por favor ingresa un monto válido')
        setLoading(false)
        return
      }
      
      const expenseData = {
        amount: amountValue,
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
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-colors"
      style={overlayStyle}
    >
      <div className="rounded-lg max-w-md w-full shadow-lg transition-colors" style={modalStyle}>
        <div className="flex items-center justify-between p-3 border-b mx-2 transition-colors" style={headerStyle}>
          <h2 className="text-lg font-semibold">
            {expense ? 'Editar Gasto' : 'Agregar Nuevo Gasto'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--foreground)' }}
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium transition-colors" style={{ color: 'var(--foreground)' }}>
              Monto
            </label>
            <AmountInput
              id="amount"
              required
              allowDecimals
              maxFractionDigits={2}
              placeholder="0,00"
              className="mt-1 block w-full h-10 border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              style={inputStyle}
              value={amount}
              onValueChange={(displayValue, numericValue) => {
                setAmount(displayValue)
                setAmountValue(numericValue)
              }}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium transition-colors" style={{ color: 'var(--foreground)' }}>
              Descripción
            </label>
            <input
              type="text"
              id="description"
              required
              className="mt-1 block w-full h-10 border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              style={inputStyle}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium transition-colors" style={{ color: 'var(--foreground)' }}>
              Categoría
            </label>
            <CustomSelect
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map(category => ({ value: category.id, label: category.name }))}
              placeholder="Selecciona una categoría"
              buttonClassName="bg-[var(--background)] text-[var(--foreground)] !border-[rgba(148,163,184,0.25)]"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium transition-colors" style={{ color: 'var(--foreground)' }}>
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
              buttonClassName="bg-[var(--background)] text-[var(--foreground)] !border-[rgba(148,163,184,0.25)]"
            />
          </div>

          {groupId && groupMembers && (
            <div>
              <label htmlFor="paidBy" className="block text-sm font-medium transition-colors" style={{ color: 'var(--foreground)' }}>
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
                buttonClassName="bg-[var(--background)] text-[var(--foreground)] !border-[rgba(148,163,184,0.25)]"
              />
            </div>
          )}

          <div>
            <label htmlFor="date" className="block text-sm font-medium transition-colors" style={{ color: 'var(--foreground)' }}>
              Fecha
            </label>
            <input
              type="date"
              id="date"
              required
              className="mt-1 block w-full h-10 border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              style={inputStyle}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t transition-colors" style={dividerStyle}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-sm font-medium transition-colors"
              style={{ borderColor: subtleBorderColor, color: 'var(--foreground)' }}
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
