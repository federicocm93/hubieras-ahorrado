import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Category } from './types'
import toast from 'react-hot-toast'

interface CategoriesStore {
  categories: Category[]
  loading: boolean
  lastFetch: Date | null
  error: string | null
  currentUserId: string | null
  
  // Actions
  fetchCategories: (userId: string, forceRefresh?: boolean) => Promise<void>
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  clearCategories: () => void
  
  // Helpers
  getCategoryById: (id: string) => Category | undefined
  shouldRefetch: () => boolean
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useCategoriesStore = create<CategoriesStore>((set, get) => ({
  categories: [],
  loading: false,
  lastFetch: null,
  error: null,
  currentUserId: null,

  shouldRefetch: () => {
    const { lastFetch } = get()
    if (!lastFetch) return true
    return Date.now() - lastFetch.getTime() > CACHE_DURATION
  },

  fetchCategories: async (userId: string, forceRefresh = false) => {
    const { categories, loading, shouldRefetch, currentUserId } = get()
    
    // If user changed, clear cache and force refresh
    if (currentUserId !== userId) {
      set({ currentUserId: userId, categories: [], lastFetch: null })
      forceRefresh = true
    }
    
    // Return cached data if available and not stale
    if (!forceRefresh && categories.length > 0 && !shouldRefetch()) {
      console.log('📦 Using cached categories')
      return
    }
    
    // Avoid multiple concurrent requests
    if (loading) {
      console.log('⏳ Categories already loading')
      return
    }

    console.log('🔄 Fetching categories from database for user:', userId)
    set({ loading: true, error: null })

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Categories fetch timeout - forcing loading to false')
      set({ loading: false, error: 'Timeout al cargar categorías' })
    }, 15000) // 15 seconds timeout

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},is_default.eq.true`)
        .order('name')

      clearTimeout(timeoutId)

      if (error) throw error

      set({ 
        categories: data || [], 
        loading: false, 
        lastFetch: new Date(),
        error: null 
      })
      
      console.log('✅ Categories fetched successfully:', data?.length || 0)
    } catch (error) {
      clearTimeout(timeoutId)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error fetching categories:', errorMessage)
      set({ 
        loading: false, 
        error: errorMessage 
      })
    }
  },

  addCategory: async (categoryData) => {
    console.log('➕ Adding category:', categoryData.name)
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single()

      if (error) throw error

      // Optimistic update
      set(state => ({
        categories: [...state.categories, data].sort((a, b) => a.name.localeCompare(b.name))
      }))
      
      console.log('✅ Category added successfully')
      toast.success('Categoría creada exitosamente')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error adding category:', errorMessage)
      toast.error('Error al crear la categoría: ' + errorMessage)
      throw error
    }
  },

  deleteCategory: async (id) => {
    const { categories } = get()
    const category = categories.find(c => c.id === id)
    
    if (category?.is_default) {
      toast.error('No se pueden eliminar las categorías predeterminadas')
      return
    }

    console.log('🗑️ Deleting category:', id)
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Optimistic update
      set(state => ({
        categories: state.categories.filter(c => c.id !== id)
      }))
      
      console.log('✅ Category deleted successfully')
      toast.success('Categoría eliminada exitosamente')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error deleting category:', errorMessage)
      toast.error('Error al eliminar la categoría: ' + errorMessage)
      throw error
    }
  },

  getCategoryById: (id) => {
    return get().categories.find(c => c.id === id)
  },

  clearCategories: () => {
    set({ categories: [], lastFetch: null, error: null })
  }
}))