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
}

interface ExpenseChartProps {
  expenses: Expense[]
}

export default function ExpenseChart({ expenses }: ExpenseChartProps) {
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
          return expenseDate >= monthStart && expenseDate <= monthEnd
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
          callback: function(value: any) {
            return '$' + value.toFixed(0)
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