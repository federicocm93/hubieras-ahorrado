'use client'

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'

interface MobileCarouselProps {
  children: ReactNode[]
  className?: string
}

export default function MobileCarousel({ children, className = '' }: MobileCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollLeft = el.scrollLeft
    const itemWidth = el.offsetWidth
    const index = Math.round(scrollLeft / itemWidth)
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollTo = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: index * el.offsetWidth, behavior: 'smooth' })
  }

  return (
    <div className={className}>
      <div
        ref={scrollRef}
        className="flex items-stretch snap-x snap-mandatory overflow-x-auto scrollbar-hide gap-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children.map((child, i) => (
          <div key={i} className="snap-center shrink-0 w-[85%] first:ml-[7.5%] last:mr-[7.5%] [&>*]:h-full">
            {child}
          </div>
        ))}
      </div>
      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {children.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-gray-300 dark:bg-slate-600'
            }`}
            aria-label={`Ir a card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
