'use client'

import { useMemo } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface ExpenseNameSuggestionsProps {
  suggestions: string[]
  onSelect: (name: string) => void
  currentInput: string
}

export default function ExpenseNameSuggestions({ suggestions, onSelect, currentInput }: ExpenseNameSuggestionsProps) {
  const { theme } = useTheme()

  const pillStyle = useMemo(() => ({
    background: theme === 'dark' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(79, 70, 229, 0.1)',
    color: theme === 'dark' ? '#a5b4fc' : '#4f46e5',
    borderColor: theme === 'dark' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(99, 102, 241, 0.3)',
  }), [theme])

  const filteredSuggestions = useMemo(() => {
    if (!currentInput.trim()) {
      return []
    }

    // Filter suggestions that include the current input (case-insensitive)
    const input = currentInput.toLowerCase()
    const filtered = suggestions
      .filter(suggestion => suggestion.toLowerCase().includes(input))
      .filter(suggestion => suggestion.toLowerCase() !== input) // Don't show exact matches

    // Ensure uniqueness (case-sensitive) and limit to 8 suggestions
    return Array.from(new Set(filtered)).slice(0, 8)
  }, [suggestions, currentInput])

  if (filteredSuggestions.length === 0) {
    return null
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
        Sugerencias:
      </p>
      <div className="flex flex-wrap gap-2">
        {filteredSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 hover:shadow-sm"
            style={pillStyle}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
