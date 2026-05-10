'use client'

import { useMemo, useState } from 'react'
import { Expense } from '@/stores/types'
import AnimatedNumber from '../ui/AnimatedNumber'

interface CategoryPieChartProps {
  expenses: Expense[]
  month: number
  year: number
  currency?: string
}

const PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#a855f7', // purple
]

const colorFor = (index: number): string => {
  if (index < PALETTE.length) return PALETTE[index]
  const hue = (index * 137.508) % 360
  return `hsl(${hue}, 65%, 58%)`
}

const polar = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const arcPath = (
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) => {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const o1 = polar(cx, cy, rOuter, startAngle)
  const o2 = polar(cx, cy, rOuter, endAngle)
  const i1 = polar(cx, cy, rInner, endAngle)
  const i2 = polar(cx, cy, rInner, startAngle)

  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ')
}

export default function CategoryPieChart({ expenses, month, year, currency }: CategoryPieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const expenseDate = new Date(expense.date)
        const dateMatches =
          expenseDate.getUTCMonth() === month && expenseDate.getUTCFullYear() === year
        const currencyMatches = !currency || expense.currency === currency
        return dateMatches && currencyMatches
      }),
    [expenses, month, year, currency],
  )

  const segments = useMemo(() => {
    const totals = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      const name = expense.categories.name
      acc[name] = (acc[name] || 0) + expense.amount
      return acc
    }, {})

    const total = Object.values(totals).reduce((sum, v) => sum + v, 0)

    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: total === 0 ? 0 : (value / total) * 100,
        color: colorFor(index),
      }))
  }, [filteredExpenses])

  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const currencyFormat = useMemo<Intl.NumberFormatOptions>(
    () => ({
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }),
    [currency],
  )

  if (filteredExpenses.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-gray-500 dark:text-slate-400">
        <div className="text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm font-medium">No hay gastos registrados</p>
          <p className="text-xs mt-1 opacity-70">para este mes</p>
        </div>
      </div>
    )
  }

  // Geometry
  const size = 240
  const cx = size / 2
  const cy = size / 2
  const rOuter = 110
  const rInner = 72
  const gapDeg = segments.length > 1 ? 1.5 : 0

  let cursor = 0
  const arcs = segments.map((segment, index) => {
    const sweep = (segment.percentage / 100) * 360
    const start = cursor + gapDeg / 2
    const end = cursor + sweep - gapDeg / 2
    cursor += sweep
    // Guard against degenerate slices
    const startAngle = Math.min(start, end)
    const endAngle = Math.max(start, end)
    const path = arcPath(cx, cy, rOuter, rInner, startAngle, endAngle)
    return { ...segment, index, path }
  })

  const active = hovered !== null ? arcs[hovered] : null
  const centerLabel = active ? active.name : 'Total'
  const centerValue = active ? active.value : total
  const centerPercent = active ? `${active.percentage.toFixed(1)}%` : `${segments.length} categorías`

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', currencyFormat).format(value)

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="overflow-visible"
          role="img"
          aria-label="Distribución de gastos por categoría"
        >
          <defs>
            {arcs.map((arc) => (
              <filter
                key={`glow-${arc.index}`}
                id={`glow-${arc.index}`}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {arcs.map((arc) => {
            const isHovered = hovered === arc.index
            const isDimmed = hovered !== null && !isHovered
            return (
              <path
                key={arc.name}
                d={arc.path}
                fill={arc.color}
                opacity={isDimmed ? 0.3 : 1}
                filter={isHovered ? `url(#glow-${arc.index})` : undefined}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  transition:
                    'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHovered(arc.index)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
          <span className="text-[11px] uppercase tracking-wider font-medium text-gray-500 dark:text-slate-400 truncate max-w-full">
            {centerLabel}
          </span>
          <AnimatedNumber
            value={centerValue}
            format={currencyFormat}
            locale="es-ES"
            className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100 tabular-nums"
            fallback={formatCurrency(centerValue)}
          />
          <span className="mt-1 text-xs text-gray-500 dark:text-slate-400 tabular-nums">
            {centerPercent}
          </span>
        </div>
      </div>

    </div>
  )
}
