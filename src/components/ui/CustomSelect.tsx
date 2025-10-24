'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  buttonClassName?: string
  searchable?: boolean
  searchPlaceholder?: string
  emptyStateText?: string
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  buttonClassName,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  emptyStateText = 'Sin resultados'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    if (!isOpen && searchTerm) {
      setSearchTerm('')
    }
  }, [isOpen, searchTerm])

  const selectedOption = options.find(option => option.value === value)
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : options

  const triggerClasses = `mt-1 relative w-full h-10 border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
    buttonClassName 
      ? `${buttonClassName}` 
      : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100'
  }`

  const handleInputFocus = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {searchable ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : (selectedOption?.label || '')}
            onChange={(e) => {
              if (!isOpen) {
                setIsOpen(true)
              }
              setSearchTerm(e.target.value)
            }}
            onFocus={() => {
              if (!isOpen) {
                setSearchTerm('')
                handleInputFocus()
              }
            }}
            placeholder={
              isOpen
                ? searchPlaceholder
                : (!selectedOption ? (placeholder || searchPlaceholder) : undefined)
            }
            className={`${triggerClasses} pr-8`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-300 transition-colors" />
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={triggerClasses}
        >
          <span className="block truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-300 transition-colors" />
          </span>
        </button>
      )}

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 shadow-lg max-h-60 rounded-md py-1 text-base border border-gray-300 dark:border-slate-700 overflow-auto focus:outline-none transition-colors">
          {filteredOptions.length === 0 && (
            <div className="py-2 px-3 text-sm text-gray-500 dark:text-slate-400">
              {emptyStateText}
            </div>
          )}

          {filteredOptions.map((option) => (
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
