'use client'

import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js'
import { Expense } from '@/stores/types'

ChartJS.register(ArcElement, Tooltip, Legend)

interface CategoryPieChartProps {
  expenses: Expense[]
  month: number
  year: number
  currency?: string
}

const generateColors = (count: number): string[] => {
  const colors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#FF6384',
    '#C9CBCF',
    '#4BC0C0',
    '#FF6384'
  ]
  
  if (count <= colors.length) {
    return colors.slice(0, count)
  }
  
  // Generate more colors if needed
  const additionalColors = []
  for (let i = colors.length; i < count; i++) {
    const hue = (i * 137.5) % 360
    additionalColors.push(`hsl(${hue}, 70%, 60%)`)
  }
  
  return [...colors, ...additionalColors]
}

export default function CategoryPieChart({ expenses, month, year, currency }: CategoryPieChartProps) {
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date)
    const dateMatches = expenseDate.getMonth() === month && expenseDate.getFullYear() === year
    const currencyMatches = !currency || expense.currency === currency
    return dateMatches && currencyMatches
  })

  if (filteredExpenses.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">📊</p>
          <p className="text-sm">No hay gastos registrados</p>
          <p className="text-xs mt-1">para este mes</p>
        </div>
      </div>
    )
  }

  // Group expenses by category
  const categoryTotals = filteredExpenses.reduce((acc, expense) => {
    const categoryName = expense.categories.name
    acc[categoryName] = (acc[categoryName] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const categories = Object.keys(categoryTotals)
  const amounts = Object.values(categoryTotals)
  const colors = generateColors(categories.length)

  const data = {
    labels: categories,
    datasets: [
      {
        data: amounts,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.8', '1')),
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'pie'>) {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = amounts.reduce((sum, amount) => sum + amount, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'USD' }).format(value)} (${percentage}%)`
          }
        }
      }
    }
  }

  return (
    <div className="h-64 relative">
      <Pie data={data} options={options} />
    </div>
  )
}