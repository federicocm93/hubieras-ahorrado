'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface DeleteConfirmPopoverProps {
  isOpen: boolean
  buttonRef: React.RefObject<HTMLButtonElement>
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmPopover({
  isOpen,
  buttonRef,
  onConfirm,
  onCancel
}: DeleteConfirmPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const subtleBorderColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.2)'

  useEffect(() => {
    if (!isOpen || !buttonRef.current || !popoverRef.current) return

    const updatePosition = () => {
      const button = buttonRef.current
      const popover = popoverRef.current
      if (!button || !popover) return

      const buttonRect = button.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()
      
      // Position popover above the button, centered horizontally
      const top = buttonRect.top - popoverRect.height - 8
      const left = buttonRect.left + buttonRect.width / 2 - popoverRect.width / 2

      // Adjust if popover goes off screen
      const adjustedLeft = Math.max(8, Math.min(left, window.innerWidth - popoverRect.width - 8))
      const adjustedTop = top < 8 ? buttonRect.bottom + 8 : top

      popover.style.position = 'fixed'
      popover.style.top = `${adjustedTop}px`
      popover.style.left = `${adjustedLeft}px`
      popover.style.zIndex = '9999'
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, buttonRef])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onCancel()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel, buttonRef])

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className="fixed z-[9999] bg-[var(--surface)] border rounded-lg shadow-lg p-3 min-w-[200px]"
      style={{
        borderColor: subtleBorderColor,
        color: 'var(--foreground)'
      }}
    >
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        ¿Eliminar este gasto?
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ borderColor: subtleBorderColor, color: 'var(--foreground)' }}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 rounded-md transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

