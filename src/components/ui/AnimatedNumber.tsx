'use client'

import 'number-flow'
import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  format: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  prefix?: string
  suffix?: string
  className?: string
  numberClassName?: string
  fallback: string
  animated?: boolean
  respectMotionPreference?: boolean
}

export default function AnimatedNumber({
  value,
  format,
  locale,
  prefix,
  suffix,
  className,
  numberClassName,
  fallback,
  animated = true,
  respectMotionPreference = true,
}: AnimatedNumberProps) {
  const flowRef = useRef<HTMLElementTagNameMap['number-flow']>(null)

  useEffect(() => {
    const element = flowRef.current
    if (!element) return

    element.animated = animated
    element.respectMotionPreference = respectMotionPreference
    element.locales = locale
    element.format = format
    element.numberPrefix = prefix
    element.numberSuffix = suffix
  }, [animated, respectMotionPreference, locale, format, prefix, suffix])

  useEffect(() => {
    const element = flowRef.current
    if (!element) return

    element.update(value)
  }, [value])

  return (
    <span className={className}>
      <number-flow ref={flowRef} className={numberClassName} aria-hidden="true" />
      <span className="sr-only">{fallback}</span>
    </span>
  )
}
