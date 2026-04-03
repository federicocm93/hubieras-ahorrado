'use client'

import { useMemo } from 'react'

import AnimatedCurrency from '@/components/ui/AnimatedCurrency'
import AnimatedNumber from '@/components/ui/AnimatedNumber'
import CurrencySelect from '@/components/ui/CurrencySelect'
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

  const otherTotalsFormat = useMemo<Intl.NumberFormatOptions>(() => ({
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }), [])

  return (
    <div className="relative rounded-2xl shadow-lg p-5 sm:p-7 transition-colors bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 text-white overflow-hidden">
      {/* Subtle decorative element */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

      <div className="relative z-10">
      <div className="mb-5 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-indigo-100 uppercase tracking-wider flex items-center gap-2">
          <CalendarRange className="w-4 h-4" />
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
              buttonClassName="!bg-white/15 !text-white !border-white/20 hover:!bg-white/25"
            />
        )}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <AnimatedCurrency
            amount={currentMonthExpenses}
            currency={selectedCurrency}
            className="block text-4xl sm:text-5xl font-extrabold text-white tracking-tight"
            numberClassName="block"
          />
          <p className="text-sm text-indigo-200 mt-1">{currentDate}</p>
        </div>
        {otherCurrencyTotals.length > 0 && (
          <div className="flex flex-col items-start sm:items-end text-xs text-indigo-200 font-semibold leading-tight">
            {otherCurrencyTotals.map(({ currency, total }) => (
              <AnimatedNumber
                key={currency}
                value={total}
                locale="es-ES"
                format={otherTotalsFormat}
                prefix="+ "
                suffix={` ${currency}`}
                className="block"
                fallback={`+ ${formatSecondaryCurrency(total)} ${currency}`}
              />
            ))}
          </div>
        )}
      </div>

      {showGroupTotals && (
        <div className="mt-4 pt-4 border-t border-white/15">
          <p className="text-xs text-indigo-200 font-semibold mb-2 flex items-center gap-1 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            Por grupo
          </p>
          <div className="space-y-1">
            {groupTotalsLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex justify-between items-center animate-pulse">
                  <div className="h-4 bg-white/10 rounded flex-1 mr-2"></div>
                  <div className="h-4 bg-white/10 rounded w-16 flex-shrink-0"></div>
                </div>
              ))
            ) : (
              groupTotals.map(group => (
                <div key={`${group.id}-${group.currency}`} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white/90 truncate flex-1 mr-2">{group.name}</span>
                  <AnimatedCurrency
                    amount={group.total}
                    currency={group.currency}
                    className="text-sm font-medium text-white/80 flex-shrink-0"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mostExpensiveCategory && (
        <div className="mt-4 pt-4 border-t border-white/15">
          <p className="mb-2 text-xs text-indigo-200 font-semibold flex items-center gap-1 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            Mayor gasto
          </p>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-white/90 truncate">{mostExpensiveCategory.category}</span>
            <AnimatedCurrency
              amount={mostExpensiveCategory.amount}
              currency={selectedCurrency}
              className="text-sm font-bold text-amber-300"
            />
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/15">
        <div className="space-y-2">
          <button
            onClick={onAddExpense}
            className="btn-press w-full flex items-center justify-center space-x-2 bg-white text-indigo-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-50 text-sm transition-colors"
          >
            <span>Agregar Gasto</span>
          </button>
          <button
            onClick={onAddCategory}
            className="btn-press w-full flex items-center justify-center space-x-2 bg-white/10 text-white px-4 py-2.5 rounded-xl hover:bg-white/20 text-sm transition-colors"
          >
            <span>Agregar Categoría</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
