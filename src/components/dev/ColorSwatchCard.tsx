import { useEffect, useState } from 'react'
import type { ColorEntry } from '@/lib/color-registry'
import { getLightness, toHex } from '@/lib/color-utils'

interface ColorSwatchCardProps {
  entry: ColorEntry
  onClick: () => void
}

export function ColorSwatchCard({ entry, onClick }: ColorSwatchCardProps) {
  const displayColor = useComputedColor(entry)
  const lightness = getLightness(displayColor)
  const isVeryLight = lightness > 0.9
  const hexDisplay = toHex(entry.value)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="group w-full cursor-pointer overflow-hidden rounded-lg border border-border text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {/* Color block */}
      <div
        className="relative h-[105px]"
        style={{ backgroundColor: displayColor }}
      >
        {isVeryLight && (
          <div className="absolute inset-0 rounded-t-lg ring-1 ring-inset ring-black/5" />
        )}
      </div>

      {/* Info block */}
      <div className="flex h-[55px] flex-col justify-center gap-0.5 bg-card px-2.5">
        <span className="truncate text-xs font-semibold text-card-foreground">
          {entry.label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {hexDisplay}
        </span>
        {entry.status === 'tokenized' && entry.token ? (
          <span className="truncate font-mono text-[10px] text-primary">
            {entry.token}
          </span>
        ) : (
          <span className="inline-flex w-fit items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
            unresolved
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * For tokenized entries, reads the live CSS variable value so the swatch
 * reflects the current theme mode (light/dark). For unresolved entries,
 * returns the static registry value.
 */
function useComputedColor(entry: ColorEntry): string {
  const [computed, setComputed] = useState(entry.value)

  useEffect(() => {
    if (!entry.token) return

    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(entry.token)
      .trim()

    if (raw) setComputed(raw)
  }, [entry.token])

  return computed
}
