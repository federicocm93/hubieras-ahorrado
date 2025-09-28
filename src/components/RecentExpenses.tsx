'use client'

import { useMemo, useState } from 'react'
import { Edit2, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, List } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'
import { formatCurrency } from '@/utils/currencies'
import type { Expense } from '@/stores/types'

interface RecentExpensesProps {
  expenses: Expense[]
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expenseId: string) => void | Promise<void>
}

const formatDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('T')[0].split('-')
  return `${day}/${month}/${year}`
}

export default function RecentExpenses({ expenses, onEditExpense, onDeleteExpense }: RecentExpensesProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const totalItems = expenses.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure current page stays in bounds if list size changes
  if (page > totalPages) {
    setPage(totalPages)
  }

  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return expenses.slice(start, end)
  }, [expenses, page, pageSize])

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  return (
    <div className="mt-4 sm:mt-8 rounded-lg shadow transition-colors" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-900 transition-colors">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
          <List className="w-5 h-5" />
          Gastos Recientes
        </h2>
      </div>

      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200 dark:divide-slate-300 transition-colors">
          {paginatedExpenses.map(expense => (
            <div key={expense.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate transition-colors">
                    {expense.description}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                    {formatDate(expense.date)} • {expense.categories.name}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onEditExpense(expense)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteExpense(expense.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900 dark:text-slate-100 transition-colors">
                  {formatCurrency(expense.amount, expense.currency)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-300 bg-gray-800 dark:bg-slate-700 px-2 py-1 rounded transition-colors">
                  {expense.currency}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Mobile pagination controls */}
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-500 transition-colors">
            Mostrando {startItem}-{endItem} de {totalItems}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <div className="w-24 sm:w-32">
              <CustomSelect
                value={String(pageSize)}
                onChange={(value) => {
                  setPage(1)
                  setPageSize(Number(value))
                }}
                options={[5, 10, 20, 50].map(size => ({ value: String(size), label: String(size) }))}
                placeholder="Tamaño"
                buttonClassName="bg-gray-800 dark:bg-slate-700 text-white"
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === 1 ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
                aria-label="Primera página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === 1 ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-500 transition-colors">
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === totalPages ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === totalPages ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
                aria-label="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-900 transition-colors">
          <thead className="transition-colors" style={{ background: 'var(--surface)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-900 uppercase tracking-wider transition-colors">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-900 uppercase tracking-wider transition-colors">
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-900 uppercase tracking-wider transition-colors">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-900 uppercase tracking-wider transition-colors">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-900 uppercase tracking-wider transition-colors">
                Moneda
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-900 uppercase tracking-wider transition-colors">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800 transition-colors" style={{ background: 'var(--surface)' }}>
            {paginatedExpenses.map(expense => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 transition-colors">
                  {formatDate(expense.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 transition-colors">
                  {expense.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 transition-colors">
                  {expense.categories.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100 transition-colors">
                  {formatCurrency(expense.amount, expense.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 transition-colors">
                  {expense.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100 transition-colors">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEditExpense(expense)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="text-red-600 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Desktop pagination controls (outside overflow container to avoid clipping) */}
      <div className="hidden sm:flex px-6 py-3 items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-500 transition-colors">
          Mostrando {startItem}-{endItem} de {totalItems}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-40">
            <CustomSelect
              value={String(pageSize)}
              onChange={(value) => {
                setPage(1)
                setPageSize(Number(value))
              }}
              options={[10, 20, 50, 100].map(size => ({ value: String(size), label: `${size} por página` }))}
              placeholder="Tamaño"
              buttonClassName="bg-gray-800 dark:bg-slate-700 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === 1 ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
              aria-label="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === 1 ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-500 transition-colors">
              {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === totalPages ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-transparent transition-colors ${page === totalPages ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300'}`}
              aria-label="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
