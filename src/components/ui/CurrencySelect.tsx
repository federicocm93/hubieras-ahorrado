'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowRightLeft } from 'lucide-react'

interface CurrencySelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  buttonClassName?: string
}
export default function CurrencySelect({ value, onChange, options, placeholder, buttonClassName }: CurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(option => option.value === value)

  return (
    <div className="relative inline-block font-semibold" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200/60 dark:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700 ${buttonClassName ?? ''}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ArrowRightLeft className="h-4 w-4 opacity-60" strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 z-50 mt-2 w-max min-w-full -translate-x-1/2 bg-white dark:bg-slate-900 shadow-lg max-h-60 rounded-lg py-1 text-base border border-gray-200 dark:border-slate-700 overflow-auto focus:outline-none transition-colors animate-modal-in">
          {options.map((option) => (
            <div
              key={option.value}
              className="cursor-pointer select-none text-sm relative py-2.5 pl-3 pr-9 hover:bg-indigo-600 hover:text-white transition-colors"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              <span className={`block truncate ${selectedOption?.value === option.value ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-300'}`}>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
