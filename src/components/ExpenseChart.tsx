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
import { Bar } from 'react-chartjs-2'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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
}

export default function ExpenseChart({ expenses, currency }: ExpenseChartProps) {
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
  }, [expenses])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
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