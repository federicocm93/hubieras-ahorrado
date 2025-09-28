'use client'

import CategoryPieChart from '../charts/CategoryPieChart'
import type { Expense } from '@/stores/types'
import { ChartPie } from 'lucide-react'

interface CategoryDistributionCardProps {
  expenses: Expense[]
  currency: string
}

export default function CategoryDistributionCard({ expenses, currency }: CategoryDistributionCardProps) {
  const today = new Date()

  return (
    <div className="rounded-lg shadow p-4 sm:p-6 transition-colors" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2 transition-colors">
        <ChartPie className="w-5 h-5" />
        Distribución por Categoría
      </h2>
      <div className="h-96 sm:h-auto">
        <CategoryPieChart
          expenses={expenses}
          month={today.getMonth()}
          year={today.getFullYear()}
          currency={currency}
        />
      </div>
    </div>
  )
}
