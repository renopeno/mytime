import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const SWATCH_COLORS = [
  { hex: '#ed3838', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#f6b03a', label: 'Amber' },
  { hex: '#96c46e', label: 'Emerald' },
  { hex: '#14b8b8', label: 'Teal' },
  { hex: '#0ea5e9', label: 'Sky' },
  { hex: '#5b8bfc', label: 'Blue' },
  { hex: '#7663f7', label: 'Indigo' },
  { hex: '#b35cf6', label: 'Violet' },
  { hex: '#f155ab', label: 'Pink' },
  { hex: '#6789b9', label: 'Slate' },
  { hex: '#000000', label: 'Black' },
] as const

interface ColorSwatchPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorSwatchPicker({ value, onChange, className }: ColorSwatchPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {SWATCH_COLORS.map(({ hex, label }) => {
        const isSelected = value.toLowerCase() === hex.toLowerCase()
        return (
          <button
            key={hex}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isSelected}
            onClick={() => onChange(hex)}
            className={cn(
              'relative h-5 w-5 rounded-full transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected && 'ring-2 ring-offset-2 ring-foreground/50'
            )}
            style={{ backgroundColor: hex }}
          >
            {isSelected && (
              <CheckIcon className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow-sm" />
            )}
          </button>
        )
      })}
    </div>
  )
}
