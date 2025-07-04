'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddCategoryModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddCategoryModal({ onClose, onSuccess }: AddCategoryModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{
          name,
          user_id: user.id,
          is_default: false,
        }])
      
      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Error al crear la categoría: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full text-gray-900 shadow-lg">
        <div className="flex items-center justify-between p-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Agregar Nueva Categoría
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
              type="text"
              id="name"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingresa el nombre de la categoría"
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
              {loading ? 'Creando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}