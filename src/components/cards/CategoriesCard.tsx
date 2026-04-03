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
    <div className="card mt-4 sm:mt-8">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-300 transition-colors">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
          <Tags className="w-5 h-5" />
          Categorías
        </h2>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 sm:gap-2.5 stagger-children">
          {orderedCategories.map(category => (
            <div
              key={category.id}
              className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
            >
              <span className="truncate max-w-[140px]">{category.name}</span>
              {!category.is_default && (
                <button
                  onClick={() => onDeleteCategory(category.id)}
                  className="text-indigo-400 hover:text-red-500 dark:text-indigo-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Eliminar categoría"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
