'use client'

import { Trash2 } from 'lucide-react'
import type { Category } from '@/stores/types'

interface CategoriesCardProps {
  categories: Category[]
  onDeleteCategory: (categoryId: string) => void | Promise<void>
}

export default function CategoriesCard({ categories, onDeleteCategory }: CategoriesCardProps) {
  return (
    <div className="mt-4 sm:mt-8 bg-white rounded-lg shadow">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">🏷️ Categorías</h2>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.map(category => (
            <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">{category.name}</span>
              {!category.is_default && (
                <button
                  onClick={() => onDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-900 p-1 flex-shrink-0"
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
