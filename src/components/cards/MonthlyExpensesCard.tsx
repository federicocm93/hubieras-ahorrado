'use client'

import ExpenseChart from '../charts/ExpenseChart'
import type { Expense } from '@/stores/types'
import { ChartLine } from 'lucide-react'
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

  useEffect(() => {
    if (typeof limit === 'number') {
      const roundedLimit = Math.round(limit)
      setInputValue(formatAmountValue(roundedLimit))
      setNumericValue(roundedLimit)
    } else {
      setInputValue('')
      setNumericValue(null)
    }
  }, [limit])

  return (
    <div className="rounded-lg shadow p-4 sm:p-6 transition-colors" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2 transition-colors">
        <ChartLine className="w-5 h-5" />
        Gastos Mensuales
      </h2>
      <div className="h-64 sm:h-auto">
        <ExpenseChart expenses={expenses} currency={currency} monthlyLimit={typeof limit === 'number' ? limit : undefined} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="monthly-limit" className="text-sm text-gray-600 dark:text-slate-300">Límite mensual</label>
        <AmountInput
          id="monthly-limit"
          className="flex-1 rounded border px-2 py-1 text-sm bg-transparent"
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
          onClick={() => {
            const amount = typeof numericValue === 'number' && isFinite(numericValue) && numericValue >= 0
              ? numericValue
              : 0
            saveLimit(amount)
          }}
          className="rounded bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
