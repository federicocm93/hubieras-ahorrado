'use client'

import { forwardRef, useMemo } from 'react'
import type { ChangeEvent, InputHTMLAttributes } from 'react'

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string
  onValueChange: (displayValue: string, numericValue: number | null) => void
  locale?: string
  allowDecimals?: boolean
  maxFractionDigits?: number
}

interface Separators {
  decimal: string
  group: string
}

interface ProcessOptions {
  separators: Separators
  allowDecimals: boolean
  maxFractionDigits: number
  integerFormatter: Intl.NumberFormat
}

interface ProcessResult {
  formatted: string
  numericValue: number | null
}

const DEFAULT_LOCALE = 'es-ES'

function getSeparators(locale: string): Separators {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6)
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? ','
  const group = parts.find((part) => part.type === 'group')?.value ?? '.'
  return { decimal, group }
}

function sanitizeInput(rawValue: string, { separators, allowDecimals, maxFractionDigits, integerFormatter }: ProcessOptions): ProcessResult {
  const { decimal, group } = separators
  const alternateDecimal = decimal === ',' ? '.' : ','

  // Remove grouping separators and normalize alternate decimal separators
  let normalized = rawValue.split(group).join('')
  if (allowDecimals) {
    normalized = normalized.split(alternateDecimal).join(decimal)
  }

  // Remove invalid characters
  const invalidCharsRegex = allowDecimals
    ? new RegExp(`[^0-9\\${decimal}]`, 'g')
    : /[^0-9]/g
  normalized = normalized.replace(invalidCharsRegex, '')

  // Ensure only one decimal separator
  if (allowDecimals) {
    const segments = normalized.split(decimal)
    if (segments.length > 2) {
      normalized = segments.shift() + decimal + segments.join('')
    }
  }

  // Limit fractional digits
  if (allowDecimals && maxFractionDigits >= 0) {
    const [integerPortion, fractionalPortion = ''] = normalized.split(decimal)
    if (fractionalPortion.length > maxFractionDigits) {
      normalized = `${integerPortion}${decimal}${fractionalPortion.slice(0, maxFractionDigits)}`
    }
  }

  const hasDecimal = allowDecimals && normalized.includes(decimal)
  const [rawInteger = '', rawFractional = ''] = hasDecimal
    ? normalized.split(decimal)
    : [normalized, '']

  let formattedInteger = ''
  if (rawInteger !== '') {
    const numericInteger = Number(rawInteger)
    formattedInteger = Number.isFinite(numericInteger)
      ? integerFormatter.format(numericInteger)
      : ''
  } else if (hasDecimal) {
    formattedInteger = '0'
  }

  // Preserve explicit zero when user typed zeros
  if (formattedInteger === '' && rawInteger === '0') {
    formattedInteger = '0'
  }

  let formatted = formattedInteger
  if (hasDecimal) {
    if (normalized.endsWith(decimal) && rawFractional === '') {
      formatted = `${formattedInteger}${decimal}`
    } else {
      formatted = `${formattedInteger}${decimal}${rawFractional}`
    }
  }

  const normalizedForParsing = allowDecimals
    ? normalized.split(decimal).join('.')
    : normalized

  let numericValue: number | null = null
  if (normalizedForParsing !== '') {
    const parsed = Number(normalizedForParsing)
    numericValue = Number.isFinite(parsed) ? parsed : null
  }

  return {
    formatted,
    numericValue,
  }
}

const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  {
    value = '',
    onValueChange,
    locale = DEFAULT_LOCALE,
    allowDecimals = false,
    maxFractionDigits,
    inputMode,
    ...rest
  },
  ref
) {
  const fractionDigits = maxFractionDigits ?? (allowDecimals ? 2 : 0)
  const separators = useMemo(() => getSeparators(locale), [locale])
  const integerFormatter = useMemo(() => new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }), [locale])

  const processOptions = useMemo<ProcessOptions>(() => ({
    separators,
    allowDecimals,
    maxFractionDigits: fractionDigits,
    integerFormatter,
  }), [separators, allowDecimals, fractionDigits, integerFormatter])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value
    const { formatted, numericValue } = sanitizeInput(rawValue, processOptions)
    onValueChange(formatted, numericValue)
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode={inputMode ?? (allowDecimals ? 'decimal' : 'numeric')}
      value={value}
      onChange={handleChange}
    />
  )
})

AmountInput.displayName = 'AmountInput'

export default AmountInput

interface FormatAmountOptions {
  locale?: string
  allowDecimals?: boolean
  maxFractionDigits?: number
}

export function formatAmountValue(
  value: number,
  { locale = DEFAULT_LOCALE, allowDecimals = false, maxFractionDigits }: FormatAmountOptions = {}
): string {
  const fractionDigits = maxFractionDigits ?? (allowDecimals ? 2 : 0)

  return new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: allowDecimals ? 0 : 0,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function parseAmountValue(
  value: string,
  { locale = DEFAULT_LOCALE, allowDecimals = false, maxFractionDigits }: FormatAmountOptions = {}
): number | null {
  const fractionDigits = maxFractionDigits ?? (allowDecimals ? 2 : 0)
  const separators = getSeparators(locale)
  const integerFormatter = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 })

  const { numericValue } = sanitizeInput(value, {
    separators,
    allowDecimals,
    maxFractionDigits: fractionDigits,
    integerFormatter,
  })

  return numericValue
}
