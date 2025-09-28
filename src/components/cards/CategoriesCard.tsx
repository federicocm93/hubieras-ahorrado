'use client'

import { Trash2, Tags } from 'lucide-react'
import type { Category } from '@/stores/types'

interface CategoriesCardProps {
  categories: Category[]
  onDeleteCategory: (categoryId: string) => void | Promise<void>
}

export default function CategoriesCard({ categories, onDeleteCategory }: CategoriesCardProps) {

  const orderedCategories = categories.sort((a, b) => {
    // First, prioritize default categories
    if (a.is_default && !b.is_default) return -1
    if (!a.is_default && b.is_default) return 1
    // Then sort alphabetically by name
    return a.name.localeCompare(b.name)
  })
  return (
    <div className="mt-4 sm:mt-8 rounded-lg shadow transition-colors" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-300 transition-colors">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
          <Tags className="w-5 h-5" />
          Categorías
        </h2>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {orderedCategories.map(category => (
            <div key={category.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-300 rounded-lg min-w-0 transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate flex-1 mr-2 transition-colors">{category.name}</span>
              {!category.is_default && (
                <button
                  onClick={() => onDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-400 p-1 flex-shrink-0 transition-colors"
                  title="Eliminar categoría"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
