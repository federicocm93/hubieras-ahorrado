'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import CustomSelect from '@/components/ui/CustomSelect'

interface Category {
  id: string
  name: string
}

interface Expense {
  id: string
  amount: number
  description: string
  date: string
  category_id: string
  group_id?: string
  paid_by?: string
}

interface GroupMember {
  id: string
  user_id: string
  user_email?: string
}

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
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString())
      setDescription(expense.description)
      setCategoryId(expense.category_id)
      setDate(expense.date)
      setPaidBy(expense.paid_by || '')
    } else {
      setDate(new Date().toISOString().split('T')[0])
      setPaidBy(user?.id || '')
    }
  }, [expense, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      const expenseData = {
        amount: parseFloat(amount),
        description,
        category_id: categoryId,
        user_id: user.id,
        date,
        ...(groupId && {
          group_id: groupId,
          paid_by: paidBy || user.id
        })
      }

      if (expense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', expense.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData])
        
        if (error) throw error
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
    <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full text-gray-900 shadow-lg">
        <div className="flex items-center justify-between p-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {expense ? 'Editar Gasto' : 'Agregar Nuevo Gasto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-4">
          <div>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full h-10 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <input
              type="text"
              id="description"
              required
              className="mt-1 block w-full h-10 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <CustomSelect
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map(category => ({ value: category.id, label: category.name }))}
              placeholder="Selecciona una categoría"
            />
          </div>

          {groupId && groupMembers && (
            <div>
              <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700">
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
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Fecha
            </label>
            <input
              type="date"
              id="date"
              required
              className="mt-1 block w-full h-10 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : expense ? 'Actualizar Gasto' : 'Agregar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}