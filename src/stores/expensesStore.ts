import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Expense } from './types'
import toast from 'react-hot-toast'

interface ExpensesStore {
  expenses: Expense[]
  loading: boolean
  lastFetch: Date | null
  error: string | null
  
  // Actions
  fetchExpenses: (forceRefresh?: boolean) => Promise<void>
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'categories'>) => Promise<void>
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id' | 'created_at' | 'categories'>>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  clearExpenses: () => void
  
  // Helpers
  getExpenseById: (id: string) => Expense | undefined
  getExpensesByCategory: (categoryId: string) => Expense[]
  getTotalExpenses: () => number
  shouldRefetch: () => boolean
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes (shorter for more dynamic data)

export const useExpensesStore = create<ExpensesStore>((set, get) => ({
  expenses: [],
  loading: false,
  lastFetch: null,
  error: null,

  shouldRefetch: () => {
    const { lastFetch } = get()
    if (!lastFetch) return true
    return Date.now() - lastFetch.getTime() > CACHE_DURATION
  },

  fetchExpenses: async (forceRefresh = false) => {
    const { expenses, loading, shouldRefetch } = get()
    
    // Return cached data if available and not stale
    if (!forceRefresh && expenses.length > 0 && !shouldRefetch()) {
      console.log('📦 Using cached expenses')
      return
    }
    
    // Avoid multiple concurrent requests
    if (loading) {
      console.log('⏳ Expenses already loading')
      return
    }

    console.log('🔄 Fetching expenses from database')
    set({ loading: true, error: null })

    try {
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

      if (error) throw error

      set({ 
        expenses: data || [], 
        loading: false, 
        lastFetch: new Date(),
        error: null 
      })
      
      console.log('✅ Expenses fetched successfully:', data?.length || 0)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error fetching expenses:', errorMessage)
      set({ 
        loading: false, 
        error: errorMessage 
      })
    }
  },

  addExpense: async (expenseData) => {
    console.log('➕ Adding expense:', expenseData.description)
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select(`
          *,
          categories (
            name
          )
        `)
        .single()

      if (error) throw error

      // Optimistic update
      set(state => ({
        expenses: [data, ...state.expenses].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      }))
      
      console.log('✅ Expense added successfully')
      toast.success('Gasto agregado exitosamente')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error adding expense:', errorMessage)
      toast.error('Error al agregar el gasto: ' + errorMessage)
      throw error
    }
  },

  updateExpense: async (id, updates) => {
    console.log('✏️ Updating expense:', id)
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          categories (
            name
          )
        `)
        .single()

      if (error) throw error

      // Optimistic update
      set(state => ({
        expenses: state.expenses.map(expense => 
          expense.id === id ? data : expense
        ).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      }))
      
      console.log('✅ Expense updated successfully')
      toast.success('Gasto actualizado exitosamente')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error updating expense:', errorMessage)
      toast.error('Error al actualizar el gasto: ' + errorMessage)
      throw error
    }
  },

  deleteExpense: async (id) => {
    console.log('🗑️ Deleting expense:', id)
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Optimistic update
      set(state => ({
        expenses: state.expenses.filter(expense => expense.id !== id)
      }))
      
      console.log('✅ Expense deleted successfully')
      toast.success('Gasto eliminado exitosamente')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error deleting expense:', errorMessage)
      toast.error('Error al eliminar el gasto: ' + errorMessage)
      throw error
    }
  },

  getExpenseById: (id) => {
    return get().expenses.find(e => e.id === id)
  },

  getExpensesByCategory: (categoryId) => {
    return get().expenses.filter(e => e.category_id === categoryId)
  },

  getTotalExpenses: () => {
    return get().expenses.reduce((sum, expense) => sum + expense.amount, 0)
  },

  clearExpenses: () => {
    set({ expenses: [], lastFetch: null, error: null })
  }
}))