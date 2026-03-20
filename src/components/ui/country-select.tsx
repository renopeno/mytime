import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
  'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon',
  'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece',
  'Guatemala', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kosovo', 'Kuwait', 'Latvia', 'Lebanon', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malaysia', 'Malta', 'Mexico',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Nigeria', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
  'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Tanzania', 'Thailand', 'Tunisia',
  'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Zimbabwe',
]

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function CountrySelect({ value, onChange, className }: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  const isPreFilled = useRef(false)
  const needsSelect = useRef(false)

  // Select text after React commits the new value to the DOM
  useEffect(() => {
    if (needsSelect.current && search && inputRef.current) {
      inputRef.current.select()
      needsSelect.current = false
    }
  })

  const isActiveSearch = search && !isPreFilled.current
  const filtered = isActiveSearch
    ? COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES

  const ghostCountry = isActiveSearch
    ? COUNTRIES.find(c => c.toLowerCase().startsWith(search.toLowerCase()))
    : null
  const ghostSuffix = ghostCountry ? ghostCountry.substring(search.length) : null

  function handleFocus() {
    setSearch(value)
    isPreFilled.current = true
    needsSelect.current = true
    setOpen(true)
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => {
      setOpen(false)
      setSearch('')
    }, 150)
  }

  function select(country: string) {
    clearTimeout(blurTimeout.current)
    onChange(country)
    setOpen(false)
    setSearch('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghostCountry && !e.shiftKey) {
      e.preventDefault()
      select(ghostCountry)
    }
    if (e.key === 'Enter' && ghostCountry) {
      e.preventDefault()
      select(ghostCountry)
    }
    if (e.key === 'Enter' && !ghostCountry && filtered.length > 0) {
      e.preventDefault()
      select(filtered[0])
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
    }
  }

  const displayValue = open ? search : value

  return (
    <div className={cn('relative', className)}>
      {open && ghostSuffix && (
        <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-2.5">
          <span className="invisible whitespace-pre text-sm">{search}</span>
          <span className="text-sm text-muted-foreground/40">{ghostSuffix}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={e => { isPreFilled.current = false; setSearch(e.target.value) }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Select country"
        className="h-8 w-full rounded-[10px] border border-input bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/50"
      />
      {open && createPortal(
        <div
          className="z-50 max-h-52 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
          style={dropdownStyle}
        >
          {filtered.map(country => (
            <button
              key={country}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => select(country)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span className="flex-1 truncate text-left">{country}</span>
              {value === country && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No results</p>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
