import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const SWATCH_COLORS = [
  { hex: '#64748b', label: 'Slate' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#0ea5e9', label: 'Sky' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#f43f5e', label: 'Rose' },
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
