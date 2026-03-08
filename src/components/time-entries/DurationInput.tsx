import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { parseDuration, formatDuration } from '@/lib/duration'

interface DurationInputProps {
  value: number
  onChange: (minutes: number) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

export function DurationInput({
  value,
  onChange,
  placeholder = 'e.g. 130 = 1:30h',
  className,
  autoFocus,
  onKeyDown,
}: DurationInputProps) {
  const [inputValue, setInputValue] = useState(value > 0 ? formatRaw(value) : '')
  const [isFocused, setIsFocused] = useState(false)

  function formatRaw(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return String(m)
    return String(h * 100 + m)
  }

  function handleBlur() {
    setIsFocused(false)
    if (!inputValue.trim()) {
      onChange(0)
      return
    }
    const parsed = parseDuration(inputValue)
    onChange(parsed)
    setInputValue(formatRaw(parsed))
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setIsFocused(true)
    const input = e.target
    // Delay select so it runs after React re-renders with the raw value
    requestAnimationFrame(() => input.select())
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^\d]/g, '')
    setInputValue(val)
    const parsed = parseDuration(val)
    onChange(parsed)
  }

  const displayValue = isFocused ? inputValue : (value > 0 ? formatDuration(value) : '')

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
    />
  )
}
