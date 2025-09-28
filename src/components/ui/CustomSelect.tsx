'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  buttonClassName?: string
}

export default function CustomSelect({ value, onChange, options, placeholder, buttonClassName }: CustomSelectProps) {
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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`mt-1 relative w-full h-10 border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
          buttonClassName 
            ? `${buttonClassName}` 
            : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100'
        }`}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-300 transition-colors" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 shadow-lg max-h-60 rounded-md py-1 text-base border border-gray-300 dark:border-slate-700 overflow-auto focus:outline-none transition-colors">
          {options.map((option) => (
            <div
              key={option.value}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white"
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
