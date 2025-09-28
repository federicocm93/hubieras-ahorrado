'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useTheme } from '@/contexts/ThemeContext'

interface AddCategoryModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddCategoryModal({ onClose, onSuccess }: AddCategoryModalProps) {
  const { user } = useAuth()
  const { addCategory } = useCategoriesStore()
  const [name, setName] = useState('')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      await addCategory({
        name,
        user_id: user.id,
        is_default: false,
      })
      
      onSuccess()
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Error al crear la categoría: ' + (error instanceof Error ? error.message : 'Error desconocido'))
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
            Agregar Nueva Categoría
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
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingresa el nombre de la categoría"
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
              {loading ? 'Creando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
