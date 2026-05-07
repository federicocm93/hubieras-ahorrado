import type { Expense } from '@/stores/types'

export interface FixedExpensePattern {
  key: string
  description: string
  categoryId: string
  categoryName: string
  currency: string
  lastAmount: number
  lastDate: string
  typicalDay: number
}

export interface MonthProjection {
  currency: string
  daysInMonth: number
  dayOfMonth: number
  paidThisMonth: number
  variablePaidThisMonth: number
  fixedPaidThisMonth: number
  variableProjection: number
  variableRemaining: number
  pendingFixedTotal: number
  pendingFixed: FixedExpensePattern[]
  paidFixed: FixedExpensePattern[]
  projectedTotal: number
  // legacy aliases kept for the AI insights card UI
  recurringPaidThisMonth: number
  pendingRecurringsTotal: number
  pendingRecurrings: FixedExpensePattern[]
  paidRecurrings: FixedExpensePattern[]
}

const ACTIVE_WINDOW_MONTHS = 2

const MONTH_WORDS = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)\b/g
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g')

export function normalizeDescription(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(MONTH_WORDS, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const yearMonth = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

const monthsDiff = (a: Date, b: Date): number =>
  (a.getUTCFullYear() - b.getUTCFullYear()) * 12 + (a.getUTCMonth() - b.getUTCMonth())

function patternKey(e: Pick<Expense, 'description' | 'category_id'>): string {
  return `${normalizeDescription(e.description)}|${e.category_id}`
}

/**
 * Group expenses flagged as is_fixed by normalized description + category and
 * return one pattern per group, using the most recent occurrence as the
 * projected next amount.
 */
export function detectFixedPatterns(
  expenses: Expense[],
  currency: string,
  reference: Date = new Date()
): FixedExpensePattern[] {
  const refUTC = new Date(Date.UTC(reference.getFullYear(), reference.getMonth(), 15))

  const groups = new Map<string, Expense[]>()
  for (const e of expenses) {
    if (!e.is_fixed) continue
    if (e.currency !== currency) continue
    const norm = normalizeDescription(e.description)
    if (!norm) continue
    const key = patternKey(e)
    const list = groups.get(key)
    if (list) list.push(e)
    else groups.set(key, [e])
  }

  const patterns: FixedExpensePattern[] = []
  for (const [key, group] of groups) {
    group.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const last = group[0]
    if (!last.is_fixed) continue // most recent has to still be fixed

    // Drop patterns that haven't appeared in the last N months
    const lastDate = new Date(last.date)
    if (monthsDiff(refUTC, lastDate) > ACTIVE_WINDOW_MONTHS) continue

    const days = group.map(e => new Date(e.date).getUTCDate()).sort((a, b) => a - b)
    const typicalDay = days[Math.floor(days.length / 2)]

    patterns.push({
      key,
      description: last.description,
      categoryId: last.category_id,
      categoryName: last.categories?.name || 'Sin categoría',
      currency,
      lastAmount: last.amount,
      lastDate: last.date,
      typicalDay,
    })
  }

  return patterns
}

export function projectMonthEnd(
  expenses: Expense[],
  patterns: FixedExpensePattern[],
  currency: string,
  reference: Date = new Date()
): MonthProjection {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  const dayOfMonth = reference.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const thisMonthExpenses = expenses.filter(e => {
    if (e.currency !== currency) return false
    const d = new Date(e.date)
    return yearMonth(d) === currentMonthKey
  })

  let fixedPaidThisMonth = 0
  let variablePaidThisMonth = 0
  const paidPatternKeys = new Set<string>()

  for (const e of thisMonthExpenses) {
    if (e.is_fixed) {
      fixedPaidThisMonth += e.amount
      paidPatternKeys.add(patternKey(e))
    } else {
      variablePaidThisMonth += e.amount
    }
  }

  const paidFixed: FixedExpensePattern[] = []
  const pendingFixed: FixedExpensePattern[] = []
  for (const p of patterns) {
    if (paidPatternKeys.has(p.key)) paidFixed.push(p)
    else pendingFixed.push(p)
  }

  const paidThisMonth = fixedPaidThisMonth + variablePaidThisMonth
  const variableProjection =
    dayOfMonth > 0 ? (variablePaidThisMonth / dayOfMonth) * daysInMonth : 0
  const variableRemaining = Math.max(0, variableProjection - variablePaidThisMonth)
  const pendingFixedTotal = pendingFixed.reduce((s, p) => s + p.lastAmount, 0)

  const projectedTotal = fixedPaidThisMonth + variableProjection + pendingFixedTotal

  return {
    currency,
    daysInMonth,
    dayOfMonth,
    paidThisMonth,
    variablePaidThisMonth,
    fixedPaidThisMonth,
    variableProjection,
    variableRemaining,
    pendingFixedTotal,
    pendingFixed,
    paidFixed,
    projectedTotal,
    // legacy aliases
    recurringPaidThisMonth: fixedPaidThisMonth,
    pendingRecurringsTotal: pendingFixedTotal,
    pendingRecurrings: pendingFixed,
    paidRecurrings: paidFixed,
  }
}
