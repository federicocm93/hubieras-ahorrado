'use client'

import { useMemo } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonColor?: 'red' | 'indigo'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmButtonColor = 'red',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const { theme } = useTheme()
  const subtleBorderColor = useMemo(() => theme === 'dark' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.2)', [theme])
  const overlayStyle = useMemo(() => ({
    backgroundColor: theme === 'dark' ? 'rgba(2, 6, 23, 0.85)' : 'rgba(15, 23, 42, 0.12)',
    color: 'var(--foreground)'
  }), [theme])
  const modalStyle = useMemo(() => ({ background: 'var(--surface)', color: 'var(--foreground)' }), [])
  const headerStyle = useMemo(() => ({ background: 'var(--surface)', borderColor: subtleBorderColor }), [subtleBorderColor])
  const dividerStyle = useMemo(() => ({ borderColor: subtleBorderColor }), [subtleBorderColor])

  if (!isOpen) return null

  const confirmButtonClass = confirmButtonColor === 'red'
    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400'
    : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400'

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-colors"
      style={overlayStyle}
      onClick={onCancel}
    >
      <div 
        className="rounded-lg max-w-md w-full shadow-lg transition-colors" 
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b mx-2 transition-colors" style={headerStyle}>
          <h2 className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--foreground)' }}
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors">
              {message}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t transition-colors" style={dividerStyle}>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded-md text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ borderColor: subtleBorderColor, color: 'var(--foreground)' }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${confirmButtonClass} transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

