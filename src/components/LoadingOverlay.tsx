'use client'

import { useState, useEffect } from 'react'

const LOADING_MESSAGES = [
  'Preparando tus datos...',
  'Organizando tus gastos...',
  'Calculando tus totales...',
  'Sincronizando tu cuenta...',
]

interface LoadingOverlayProps {
  isVisible: boolean
}

export default function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0)
      return
    }
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2400)
    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-backdrop-in">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-gray-900/20 dark:bg-slate-950/50 backdrop-blur-sm transition-colors" />

      {/* Centered loading spinner */}
      <div className="relative z-10 flex flex-col items-center justify-center animate-modal-in">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 transition-colors" />
        <p className="mt-4 text-gray-700 dark:text-gray-200 font-medium transition-colors text-sm">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  )
}
