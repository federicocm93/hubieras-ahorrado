'use client'

import { useMemo } from 'react'

import AnimatedNumber from './AnimatedNumber'
import { formatCurrency, getLocaleForCurrency } from '@/utils/currencies'

interface AnimatedCurrencyProps {
  amount: number
  currency: string
  className?: string
  numberClassName?: string
  prefix?: string
  suffix?: string
}

export default function AnimatedCurrency({
  amount,
  currency,
  className,
  numberClassName,
  prefix,
  suffix,
}: AnimatedCurrencyProps) {
  const locale = useMemo(() => getLocaleForCurrency(currency), [currency])

  const format = useMemo<Intl.NumberFormatOptions>(() => ({
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }), [currency])

  const fallback = useMemo(() => formatCurrency(amount, currency), [amount, currency])

  return (
    <AnimatedNumber
      value={amount}
      locale={locale}
      format={format}
      prefix={prefix}
      suffix={suffix}
      className={className}
      numberClassName={numberClassName}
      fallback={fallback}
    />
  )
}
