'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Info, CircleCheck, HelpCircle, ChevronDown } from 'lucide-react'
import type { Expense } from '@/stores/types'
import { useAuth } from '@/contexts/AuthContext'
import { useMonthlyLimit } from '@/hooks/useMonthlyLimit'
import { detectFixedPatterns, projectMonthEnd } from '@/utils/recurringDetection'
import AnimatedCurrency from '@/components/ui/AnimatedCurrency'

interface AIInsightsCardProps {
  expenses: Expense[]
  currency: string
}

interface MonthlyAggregate {
  month: string
  label: string
  total: number
  byCategory: { category: string; total: number }[]
}

interface InsightItem {
  type: 'alert' | 'trend' | 'info' | 'good'
  title: string
  detail: string
}

interface InsightsPayload {
  headline: string
  insights: InsightItem[]
}

interface CachedResult {
  signature: string
  data: InsightsPayload
  generatedAt: string
  dayCutoff: number
}

function mostRecentMondayIso(now: Date = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const offsetToMonday = (dow + 6) % 7
  d.setDate(d.getDate() - offsetToMonday)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const monthLabel = (date: Date) =>
  date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

function buildAggregates(expenses: Expense[], currency: string, monthsBack: number) {
  const filtered = expenses.filter(e => e.currency === currency)

  const now = new Date()
  const currentDay = now.getDate()
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1)

  const buckets: (MonthlyAggregate & { dayWindow: number })[] = []
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - i, 1)
    const daysInThisMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const dayWindow = Math.min(currentDay, daysInThisMonth)
    buckets.push({
      month: monthKey(d),
      label: `${monthLabel(d)} (1-${dayWindow})`,
      total: 0,
      byCategory: [],
      dayWindow,
    })
  }

  const byMonth = new Map(buckets.map(b => [b.month, { totals: new Map<string, number>(), bucket: b }]))

  for (const e of filtered) {
    const d = new Date(e.date)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const entry = byMonth.get(key)
    if (!entry) continue
    if (d.getUTCDate() > entry.bucket.dayWindow) continue
    entry.bucket.total += e.amount
    const cat = e.categories?.name || 'Sin categoría'
    entry.totals.set(cat, (entry.totals.get(cat) || 0) + e.amount)
  }

  for (const { totals, bucket } of byMonth.values()) {
    bucket.byCategory = Array.from(totals.entries()).map(([category, total]) => ({ category, total }))
  }

  const stripWindow = (b: MonthlyAggregate & { dayWindow: number }): MonthlyAggregate => ({
    month: b.month,
    label: b.label,
    total: b.total,
    byCategory: b.byCategory,
  })
  const currentMonth = stripWindow(buckets[buckets.length - 1])
  const previousMonths = buckets.slice(0, -1).filter(b => b.total > 0).map(stripWindow)

  return { currentMonth, previousMonths, dayCutoff: currentDay }
}

function cacheKey(userId: string | undefined, currency: string) {
  return `ai-insights:${userId ?? 'anon'}:${currency}`
}

const typeStyles: Record<InsightItem['type'], { icon: React.ComponentType<{ className?: string }>; chip: string; iconBg: string; iconColor: string }> = {
  alert: {
    icon: AlertTriangle,
    chip: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-300',
  },
  trend: {
    icon: TrendingUp,
    chip: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-300',
  },
  info: {
    icon: Info,
    chip: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
    iconBg: 'bg-sky-100 dark:bg-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-300',
  },
  good: {
    icon: CircleCheck,
    chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
  },
}

export default function AIInsightsCard({ expenses, currency }: AIInsightsCardProps) {
  const { user } = useAuth()
  const { limit } = useMonthlyLimit(currency)

  const { currentMonth, previousMonths, dayCutoff } = useMemo(
    () => buildAggregates(expenses, currency, 5),
    [expenses, currency]
  )

  const projection = useMemo(() => {
    const patterns = detectFixedPatterns(expenses, currency)
    return projectMonthEnd(expenses, patterns, currency)
  }, [expenses, currency])

  const hasProjection =
    projection.paidThisMonth > 0 || projection.pendingRecurringsTotal > 0
  const limitDelta =
    typeof limit === 'number' && limit > 0 ? projection.projectedTotal - limit : null
  const overLimit = limitDelta !== null && limitDelta > 0

  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)

  useEffect(() => {
    if (!tooltipOpen) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [tooltipOpen])

  const signature = useMemo(
    () => JSON.stringify({ cur: currency, lim: limit ?? null, week: mostRecentMondayIso() }),
    [currency, limit]
  )

  const [data, setData] = useState<InsightsPayload | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [activeDayCutoff, setActiveDayCutoff] = useState<number>(dayCutoff)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef<AbortController | null>(null)

  const fetchInsights = useCallback(
    async (force = false) => {
      if (currentMonth.total === 0 && previousMonths.length === 0) {
        setData(null)
        setError(null)
        return
      }

      const storageKey = cacheKey(user?.id, currency)

      if (!force && typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(storageKey)
          if (raw) {
            const cached = JSON.parse(raw) as CachedResult
            if (cached.signature === signature) {
              setData(cached.data)
              setGeneratedAt(cached.generatedAt)
              setActiveDayCutoff(cached.dayCutoff ?? dayCutoff)
              setError(null)
              return
            }
          }
        } catch {
          // ignore cache errors
        }
      }

      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller

      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            currency,
            monthlyLimit: limit ?? null,
            dayCutoff,
            currentMonth,
            previousMonths,
          }),
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `Error ${res.status}`)
        }
        const json = (await res.json()) as { data: InsightsPayload; generatedAt: string }
        if (!json?.data || !Array.isArray(json.data.insights)) {
          throw new Error('Respuesta inválida del asistente.')
        }

        setData(json.data)
        setGeneratedAt(json.generatedAt)
        setActiveDayCutoff(dayCutoff)

        if (typeof window !== 'undefined') {
          const toCache: CachedResult = {
            signature,
            data: json.data,
            generatedAt: json.generatedAt,
            dayCutoff,
          }
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(toCache))
          } catch {
            // ignore quota errors
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [currency, currentMonth, previousMonths, limit, dayCutoff, signature, user?.id]
  )

  useEffect(() => {
    fetchInsights(false)
    return () => inFlight.current?.abort()
  }, [fetchInsights])

  const hasNoData = currentMonth.total === 0 && previousMonths.length === 0
  const lastUpdated = generatedAt
    ? new Date(generatedAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
    : null
  const windowLabel = `Comparando 1-${activeDayCutoff} de cada mes`

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Resumen del asistente
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {windowLabel}
              {lastUpdated ? ` · ${lastUpdated}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={loading || hasNoData}
          onClick={() => fetchInsights(true)}
          className="btn-press inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Regenerar resumen"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{loading ? 'Generando...' : 'Regenerar'}</span>
        </button>
      </div>

      {hasProjection && (
        <div className="mb-5 pb-5 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mb-1">
            <span>Estimado a fin de mes</span>
            <div className="relative inline-flex" ref={tooltipRef}>
              <button
                type="button"
                onClick={() => setTooltipOpen(v => !v)}
                onMouseEnter={() => setTooltipOpen(true)}
                onMouseLeave={() => setTooltipOpen(false)}
                aria-label="Cómo se calcula el estimado"
                className="inline-flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              {tooltipOpen && (
                <div
                  role="tooltip"
                  className="absolute left-0 top-full mt-2 z-20 w-72 sm:w-80 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-3.5 text-left"
                >
                  <div className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">
                    Cómo se calcula
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-slate-300">
                    <div className="flex justify-between gap-3">
                      <span>Lo ya gastado este mes</span>
                      <AnimatedCurrency
                        amount={projection.paidThisMonth}
                        currency={currency}
                        className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0"
                      />
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>+ Resto variable a tu ritmo</span>
                      <AnimatedCurrency
                        amount={projection.variableRemaining}
                        currency={currency}
                        className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0"
                      />
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>
                        + Fijos por venir
                        {projection.pendingFixed.length > 0
                          ? ` (${projection.pendingFixed.length})`
                          : ''}
                      </span>
                      <AnimatedCurrency
                        amount={projection.pendingFixedTotal}
                        currency={currency}
                        className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0"
                      />
                    </div>
                    <div className="flex justify-between gap-3 pt-1.5 border-t border-gray-100 dark:border-slate-800">
                      <span className="font-semibold text-gray-700 dark:text-slate-200">Total</span>
                      <AnimatedCurrency
                        amount={projection.projectedTotal}
                        currency={currency}
                        className="font-semibold text-gray-900 dark:text-slate-100 flex-shrink-0"
                      />
                    </div>
                  </div>
                  {(projection.paidFixed.length > 0 ||
                    projection.pendingFixed.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      <div className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1.5">
                        Gastos fijos
                      </div>
                      <ul className="space-y-1">
                        {projection.paidFixed.map(p => (
                          <li key={p.key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate">
                              <span className="text-gray-700 dark:text-slate-200">{p.description}</span>
                              <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">pagado</span>
                            </span>
                            <AnimatedCurrency
                              amount={p.lastAmount}
                              currency={currency}
                              className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0"
                            />
                          </li>
                        ))}
                        {projection.pendingFixed.map(p => (
                          <li key={p.key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate">
                              <span className="text-gray-700 dark:text-slate-200">{p.description}</span>
                              <span className="ml-1.5 text-amber-600 dark:text-amber-400">por venir</span>
                            </span>
                            <AnimatedCurrency
                              amount={p.lastAmount}
                              currency={currency}
                              className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-2.5 text-[11px] leading-snug text-gray-500 dark:text-slate-400">
                    El resto variable extrapola tu ritmo diario de gastos no fijos hasta fin de mes. Los gastos fijos que ya pagaste este mes no se proyectan otra vez; los pendientes usan el último monto pagado (así la inflación se ajusta sola). Se toman de los gastos que marcaste como fijos en los últimos meses.
                  </p>
                </div>
              )}
            </div>
          </div>
          <AnimatedCurrency
            amount={projection.projectedTotal}
            currency={currency}
            className={`block text-3xl sm:text-4xl font-bold tracking-tight ${
              overLimit
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-900 dark:text-slate-100'
            }`}
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Día {projection.dayOfMonth} de {projection.daysInMonth}
          </p>
        </div>
      )}

      {hasNoData ? (
        <div className="text-sm text-gray-500 dark:text-slate-400 py-6 text-center">
          Cargá algunos gastos en {currency} para que el asistente pueda analizarte.
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAnalysisOpen(v => !v)}
            aria-expanded={analysisOpen}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-slate-100 transition-colors py-1"
          >
            <span className="flex items-center gap-2">
              Análisis del asistente
              {data && (
                <span className="text-xs font-normal text-gray-400 dark:text-slate-500">
                  {data.insights.length}
                </span>
              )}
              {error && !analysisOpen && (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" aria-label="Hubo un error" />
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${analysisOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {analysisOpen && (
            <div className="mt-4">
              {loading && !data ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 dark:border-slate-800 p-3 animate-pulse">
                      <div className="h-4 w-1/3 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 w-3/4 bg-gray-200 dark:bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
                  No pude generar el resumen: {error}
                </div>
              ) : data ? (
                <div className="space-y-3">
                  {data.headline && (
                    <div className="text-base font-medium text-gray-900 dark:text-slate-100 leading-snug">
                      {data.headline}
                    </div>
                  )}
                  <div className="space-y-2">
                    {data.insights.map((item, i) => {
                      const style = typeStyles[item.type] ?? typeStyles.info
                      const Icon = style.icon
                      return (
                        <div
                          key={i}
                          className={`rounded-xl border ${style.chip} px-3 py-2.5 flex items-start gap-3`}
                        >
                          <div className={`w-7 h-7 rounded-lg ${style.iconBg} ${style.iconColor} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold leading-tight">{item.title}</div>
                            <div className="text-xs sm:text-sm opacity-90 mt-0.5 leading-snug">{item.detail}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  )
}
