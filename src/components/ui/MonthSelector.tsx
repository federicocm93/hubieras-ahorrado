'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
  className?: string
  buttonClassName?: string
  labelClassName?: string
}

const formatLabel = (month: number, year: number) => {
  const date = new Date(year, month, 1)
  return date
    .toLocaleString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

export default function MonthSelector({
  month,
  year,
  onChange,
  className = '',
  buttonClassName = '',
  labelClassName = '',
}: MonthSelectorProps) {
  const now = new Date()
  const isCurrentOrFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth())

  const goPrev = () => {
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    onChange(m, y)
  }

  const goNext = () => {
    if (isCurrentOrFuture) return
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    onChange(m, y)
  }

  const baseButton =
    'p-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={goPrev}
        aria-label="Mes anterior"
        className={`${baseButton} ${buttonClassName}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className={`min-w-[8rem] text-center select-none ${labelClassName}`}>
        {formatLabel(month, year)}
      </span>
      <button
        type="button"
        onClick={goNext}
        disabled={isCurrentOrFuture}
        aria-label="Mes siguiente"
        className={`${baseButton} ${buttonClassName}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
