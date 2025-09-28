'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { useTheme } from '@/contexts/ThemeContext'
import { Bar } from 'react-chartjs-2'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
)

interface Expense {
  id: string
  amount: number
  date: string
  currency: string
}

interface ExpenseChartProps {
  expenses: Expense[]
  currency?: string
  monthlyLimit?: number
}

export default function ExpenseChart({ expenses, currency, monthlyLimit }: ExpenseChartProps) {
  const { theme } = useTheme()
  const isDarkTheme = theme === 'dark'
  const textColor = isDarkTheme ? 'rgba(226, 232, 240, 0.92)' : '#0f172a'

  const chartData = useMemo(() => {
    const now = new Date()
    const sixMonthsAgo = subMonths(now, 5)
    
    const months = eachMonthOfInterval({
      start: sixMonthsAgo,
      end: now
    })

    const monthlyTotals = months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      
      const total = expenses
        .filter(expense => {
          const expenseDate = new Date(expense.date)
          const dateMatches = expenseDate >= monthStart && expenseDate <= monthEnd
          const currencyMatches = !currency || expense.currency === currency
          return dateMatches && currencyMatches
        })
        .reduce((sum, expense) => sum + expense.amount, 0)
      
      return {
        month: format(month, 'MMM yyyy'),
        total: total
      }
    })

    return {
      labels: monthlyTotals.map(item => item.month),
      datasets: [
        {
          label: 'Gastos Mensuales',
          data: monthlyTotals.map(item => item.total),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
        },
      ],
    }
  }, [expenses, currency])

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.85)' : undefined,
        bodyColor: textColor,
        titleColor: textColor,
      },
      // Horizontal line for monthly limit
      ...(typeof monthlyLimit === 'number' ? {
        annotation: {
          annotations: {
            limitLine: {
              type: 'line',
              yMin: monthlyLimit,
              yMax: monthlyLimit,
              borderColor: '#ef4444',
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: `Límite: ${new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: currency || 'USD',
                  maximumFractionDigits: 0,
                }).format(monthlyLimit)}`,
                enabled: true,
                position: 'end',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                font: { size: 11 },
                padding: 4,
              },
            }
          }
        }
      } : {})
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: textColor,
          callback: function(value: string | number) {
            return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(Number(value))
          }
        }
      },
    },
  }

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  )
}
