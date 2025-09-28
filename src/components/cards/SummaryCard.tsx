'use client'

import CurrencySelect from '@/components/ui/CurrencySelect'
import { formatCurrency } from '@/utils/currencies'
import type { GroupTotal } from '@/stores/groupTotalsStore'
import { CalendarRange, TrendingUp, Users, Zap } from 'lucide-react'

interface SummaryCardProps {
  selectedCurrency: string
  onCurrencyChange: (currency: string) => void
  availableCurrencies: string[]
  currentMonthExpenses: number
  currentDate: string
  monthlyTotalsByCurrency: { currency: string; total: number }[]
  groupTotals: GroupTotal[]
  groupTotalsLoading: boolean
  mostExpensiveCategory: { category: string; amount: number } | null
  onAddExpense: () => void
  onAddCategory: () => void
}

export default function SummaryCard({
  selectedCurrency,
  onCurrencyChange,
  availableCurrencies,
  currentMonthExpenses,
  currentDate,
  monthlyTotalsByCurrency,
  groupTotals,
  groupTotalsLoading,
  mostExpensiveCategory,
  onAddExpense,
  onAddCategory,
}: SummaryCardProps) {
  const showGroupTotals = groupTotalsLoading || groupTotals.length > 0
  const otherCurrencyTotals = monthlyTotalsByCurrency.filter(
    ({ currency, total }) => currency !== selectedCurrency && total > 0
  )

  const formatSecondaryCurrency = (amount: number) =>
    amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="relative rounded-lg shadow p-4 sm:p-6 transition-colors" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
          <CalendarRange className="w-5 h-5" />
          Resumen mensual
        </h2>
        {availableCurrencies.length > 0 && (
            <CurrencySelect
              value={selectedCurrency}
              onChange={onCurrencyChange}
              options={availableCurrencies.map(currency => ({
                value: currency,
                label: currency,
              }))}
              placeholder="Seleccionar moneda"
              buttonClassName="mt-0 h-8 py-1 text-sm"
            />
        )}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
          {formatCurrency(currentMonthExpenses, selectedCurrency)}
        </div>
        {otherCurrencyTotals.length > 0 && (
          <div className="flex flex-col items-start sm:items-end text-xs text-gray-700 font-semibold dark:text-gray-300 leading-tight transition-colors">
            {otherCurrencyTotals.map(({ currency, total }) => (
              <span key={currency}>{`+ ${formatSecondaryCurrency(total)} ${currency}`}</span>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-900 dark:text-gray-300 mt-2 transition-colors">{currentDate}</p>

      {showGroupTotals && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-300 transition-colors">
          <p className="text-sm text-gray-900 dark:text-gray-300 font-semibold mb-2 flex items-center gap-1 transition-colors">
            <Users className="w-4 h-4" />
            Resumen de gastos por grupo:
          </p>
          <div className="space-y-1">
            {groupTotalsLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex justify-between items-center animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded flex-1 mr-2 transition-colors"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-16 flex-shrink-0 transition-colors"></div>
                </div>
              ))
            ) : (
              groupTotals.map(group => (
                <div key={`${group.id}-${group.currency}`} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate flex-1 mr-2 transition-colors">{group.name}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-shrink-0 transition-colors">
                    {formatCurrency(group.total, group.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mostExpensiveCategory && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-300 transition-colors">
          <p className="mb-2 text-sm text-gray-900 dark:text-gray-300 font-semibold flex items-center gap-1 transition-colors">
            <TrendingUp className="w-4 h-4" />
            Categoría con más gastos
          </p>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate transition-colors">{mostExpensiveCategory.category}</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400 transition-colors">
              {formatCurrency(mostExpensiveCategory.amount, selectedCurrency)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-300 transition-colors">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-3 flex items-center gap-1 transition-colors">
          <Zap className="w-4 h-4" />
          Acciones Rápidas
        </h3>
        <div className="space-y-2">
          <button
            onClick={onAddExpense}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-400 text-sm transition-colors"
          >
            <span>Agregar Gasto</span>
          </button>
          <button
            onClick={onAddCategory}
            className="w-full flex items-center justify-center space-x-2 bg-gray-600 dark:bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-slate-500 text-sm transition-colors"
          >
            <span>Agregar Categoría</span>
          </button>
        </div>
      </div>
    </div>
  )
}
