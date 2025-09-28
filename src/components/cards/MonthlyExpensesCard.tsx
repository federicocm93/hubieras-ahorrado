'use client'

import ExpenseChart from '../charts/ExpenseChart'
import type { Expense } from '@/stores/types'
import { ChartLine } from 'lucide-react'
import { useMonthlyLimit } from '../../hooks/useMonthlyLimit'
import { useEffect, useState } from 'react'

interface MonthlyExpensesCardProps {
  expenses: Expense[]
  currency: string
}

export default function MonthlyExpensesCard({ expenses, currency }: MonthlyExpensesCardProps) {
  const { limit, loading, saving, saveLimit } = useMonthlyLimit(currency)
  const [inputValue, setInputValue] = useState<string>('')

  const formatAmount = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)
  const parseAmount = (value: string) => {
    const digits = value.replace(/\D/g, '')
    return digits ? Number(digits) : 0
  }

  useEffect(() => {
    if (typeof limit === 'number') {
      setInputValue(formatAmount(Math.round(limit)))
    } else {
      setInputValue('')
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
        <input
          id="monthly-limit"
          type="text"
          inputMode="numeric"
          className="flex-1 rounded border px-2 py-1 text-sm bg-transparent"
          value={inputValue}
          onChange={(e) => {
            const raw = e.target.value
            const amount = parseAmount(raw)
            setInputValue(raw === '' ? '' : formatAmount(amount))
          }}
          placeholder="Ej: 2000"
        />
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => {
            const parsed = parseAmount(inputValue)
            const amount = isFinite(parsed) && parsed >= 0 ? parsed : 0
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
