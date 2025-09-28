'use client'

import ExpenseChart from '../charts/ExpenseChart'
import type { Expense } from '@/stores/types'
import { ChartLine } from 'lucide-react'

interface MonthlyExpensesCardProps {
  expenses: Expense[]
  currency: string
}

export default function MonthlyExpensesCard({ expenses, currency }: MonthlyExpensesCardProps) {
  return (
    <div className="rounded-lg shadow p-4 sm:p-6 transition-colors" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2 transition-colors">
        <ChartLine className="w-5 h-5" />
        Gastos Mensuales
      </h2>
      <div className="h-64 sm:h-auto">
        <ExpenseChart expenses={expenses} currency={currency} />
      </div>
    </div>
  )
}
