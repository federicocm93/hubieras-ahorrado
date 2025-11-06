'use client'

import { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import DeleteConfirmPopover from './DeleteConfirmPopover'

interface DeleteButtonWithConfirmProps {
  expenseId: string
  onConfirm: () => void
  className?: string
  title?: string
}

export default function DeleteButtonWithConfirm({
  expenseId,
  onConfirm,
  className = 'text-red-600 hover:text-red-500 transition-colors',
  title = 'Eliminar'
}: DeleteButtonWithConfirmProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    onConfirm()
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={className}
        title={title}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <DeleteConfirmPopover
        isOpen={showConfirm}
        buttonRef={buttonRef}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}

