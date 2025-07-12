import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Expense } from './types'
import toast from 'react-hot-toast'

interface ExpensesStore {
  expenses: Expense[]
  loading: boolean
  lastFetch: Date | null
  error: string | null
  currentUserId: string | null
  
  // Actions
  fetchExpenses: (userId: string, forceRefresh?: boolean) => Promise<void>
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'categories'>) => Promise<void>
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id' | 'created_at' | 'categories'>>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  clearExpenses: () => void
  
  // Helpers
  getExpenseById: (id: string) => Expense | undefined
  getExpensesByCategory: (categoryId: string) => Expense[]
  getTotalExpensesByDate: (month: number, year: number, currency?: string) => number
  getMostExpensiveCategoryByDate: (month: number, year: number, currency?: string) => { category: string; amount: number } | null
  getExpensesByCurrency: (currency: string) => Expense[]
  getAvailableCurrencies: () => string[]
  shouldRefetch: () => boolean
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes (shorter for more dynamic data)

export const useExpensesStore = create<ExpensesStore>((set, get) => ({
  expenses: [],
  loading: false,
  lastFetch: null,
  error: null,
  currentUserId: null,

  shouldRefetch: () => {
    const { lastFetch } = get()
    if (!lastFetch) return true
    return Date.now() - lastFetch.getTime() > CACHE_DURATION
  },

  fetchExpenses: async (userId: string, forceRefresh = false) => {
    const { expenses, loading, shouldRefetch, currentUserId } = get()
    
    // If user changed, clear cache and force refresh
    if (currentUserId !== userId) {
      set({ currentUserId: userId, expenses: [], lastFetch: null })
      forceRefresh = true
    }
    
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

    console.log('🔄 Fetching expenses from database for user:', userId)
    set({ loading: true, error: null })

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Expenses fetch timeout - forcing loading to false')
      set({ loading: false, error: 'Timeout al cargar gastos' })
    }, 15000) // 15 seconds timeout

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          categories (
            name
          )
        `)
        .eq('user_id', userId)
        .is('group_id', null)
        .order('date', { ascending: false })

      clearTimeout(timeoutId)

      if (error) throw error

      set({ 
        expenses: data || [], 
        loading: false, 
        lastFetch: new Date(),
        error: null 
      })
      
      console.log('✅ Expenses fetched successfully:', data?.length || 0)
    } catch (error) {
      clearTimeout(timeoutId)
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

  getTotalExpensesByDate: (month: number, year: number, currency?: string) => {
    return get().expenses.reduce((sum, expense) => {
      const expenseDate = new Date(expense.date)
      if (expenseDate.getMonth() === month && expenseDate.getFullYear() === year) {
        if (currency && expense.currency !== currency) {
          return sum
        }
        return sum + expense.amount
      }
      return sum
    }, 0)
  },

  getMostExpensiveCategoryByDate: (month: number, year: number, currency?: string) => {
    const filteredExpenses = get().expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      const dateMatches = expenseDate.getMonth() === month && expenseDate.getFullYear() === year
      const currencyMatches = !currency || expense.currency === currency
      return dateMatches && currencyMatches
    })

    if (filteredExpenses.length === 0) return null

    const categoryTotals = filteredExpenses.reduce((acc, expense) => {
      const categoryName = expense.categories.name
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    const mostExpensiveCategory = Object.entries(categoryTotals).reduce((max, [category, amount]) => {
      return amount > max.amount ? { category, amount } : max
    }, { category: '', amount: 0 })

    return mostExpensiveCategory.amount > 0 ? mostExpensiveCategory : null
  },

  getExpensesByCurrency: (currency: string) => {
    return get().expenses.filter(expense => expense.currency === currency)
  },

  getAvailableCurrencies: () => {
    const expenses = get().expenses
    const currencies = [...new Set(expenses.map(expense => expense.currency))]
    return currencies.sort()
  },

  clearExpenses: () => {
    set({ expenses: [], lastFetch: null, error: null })
  }
}))