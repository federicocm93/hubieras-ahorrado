'use client'

import { Plus } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'
import { formatCurrency } from '@/utils/currencies'
import type { GroupTotal } from '@/stores/groupTotalsStore'

interface SummaryCardProps {
  selectedCurrency: string
  onCurrencyChange: (currency: string) => void
  availableCurrencies: string[]
  currentMonthExpenses: number
  currentDate: string
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
  groupTotals,
  groupTotalsLoading,
  mostExpensiveCategory,
  onAddExpense,
  onAddCategory,
}: SummaryCardProps) {
  const showGroupTotals = groupTotalsLoading || groupTotals.length > 0

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
        <h2 className="text-lg font-semibold text-gray-900">📊 Resumen mensual</h2>
        {availableCurrencies.length > 0 && (
          <div className="w-full sm:w-32">
            <CustomSelect
              value={selectedCurrency}
              onChange={onCurrencyChange}
              options={availableCurrencies.map(currency => ({
                value: currency,
                label: currency,
              }))}
              placeholder="Seleccionar moneda"
            />
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-indigo-600">
        {formatCurrency(currentMonthExpenses, selectedCurrency)}
      </div>
      <p className="text-sm text-gray-500 mt-2">{currentDate}</p>

      {showGroupTotals && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Resumen de gastos por grupo:</p>
          <div className="space-y-1">
            {groupTotalsLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex justify-between items-center animate-pulse">
                  <div className="h-4 bg-gray-200 rounded flex-1 mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 flex-shrink-0"></div>
                </div>
              ))
            ) : (
              groupTotals.map(group => (
                <div key={`${group.id}-${group.currency}`} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 truncate flex-1 mr-2">{group.name}</span>
                  <span className="text-sm font-medium text-gray-800 flex-shrink-0">
                    {formatCurrency(group.total, group.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mostExpensiveCategory && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">🔥 Categoría con más gastos</p>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-1 space-y-1 sm:space-y-0">
            <span className="text-lg font-semibold text-gray-900 truncate">{mostExpensiveCategory.category}</span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(mostExpensiveCategory.amount, selectedCurrency)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-3">⚡ Acciones Rápidas</h3>
        <div className="space-y-2">
          <button
            onClick={onAddExpense}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>💸 Agregar Gasto</span>
          </button>
          <button
            onClick={onAddCategory}
            className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>📝 Agregar Categoría</span>
          </button>
        </div>
      </div>
    </div>
  )
}
