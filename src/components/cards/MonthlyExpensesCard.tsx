'use client'

import ExpenseChart from '../charts/ExpenseChart'
import type { Expense } from '@/stores/types'
import { ChartLine, Pencil } from 'lucide-react'
import { useMonthlyLimit } from '../../hooks/useMonthlyLimit'
import { useEffect, useState } from 'react'
import AmountInput, { formatAmountValue } from '@/components/ui/AmountInput'

interface MonthlyExpensesCardProps {
  expenses: Expense[]
  currency: string
}

export default function MonthlyExpensesCard({ expenses, currency }: MonthlyExpensesCardProps) {
  const { limit, loading, saving, saveLimit } = useMonthlyLimit(currency)
  const [inputValue, setInputValue] = useState<string>('')
  const [numericValue, setNumericValue] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)

  useEffect(() => {
    if (typeof limit === 'number') {
      const roundedLimit = Math.round(limit)
      setInputValue(formatAmountValue(roundedLimit))
      setNumericValue(roundedLimit)
      setIsEditing(false)
    } else {
      setInputValue('')
      setNumericValue(null)
      setIsEditing(true)
    }
  }, [limit])

  return (
    <div className="card p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2 transition-colors">
        <ChartLine className="w-5 h-5" />
        Gastos Mensuales
      </h2>
      <div className="h-64 sm:h-auto">
        <ExpenseChart expenses={expenses} currency={currency} monthlyLimit={typeof limit === 'number' ? limit : undefined} />
      </div>
      {(!loading && (isEditing || limit === null)) ? (
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="monthly-limit" className="text-sm text-gray-600 dark:text-slate-300">Límite mensual</label>
          <AmountInput
            id="monthly-limit"
            className="flex-1 min-w-0 rounded-md border border-[rgba(148,163,184,0.25)] px-2.5 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            value={inputValue}
            onValueChange={(display, numeric) => {
              setInputValue(display)
              setNumericValue(typeof numeric === 'number' ? Math.round(numeric) : null)
            }}
            placeholder="Ej: 2000"
          />
          <button
            type="button"
            disabled={saving || loading}
            onClick={async () => {
              const amount = typeof numericValue === 'number' && isFinite(numericValue) && numericValue >= 0
                ? numericValue
                : 0
              await saveLimit(amount)
              setIsEditing(false)
            }}
            className="btn-press rounded-md bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-slate-300">Límite mensual</span>
          <span className="text-sm font-medium">
            {typeof limit === 'number' ? formatAmountValue(Math.round(limit)) : '—'}
          </span>
          <button
            type="button"
            aria-label="Editar límite"
            className="icon-lift ml-auto p-2 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
