import { useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ColorEntry } from '@/lib/color-registry'
import { colorDistance, distanceLabel, toHex } from '@/lib/color-utils'

interface SimilarColorsPopoverProps {
  entry: ColorEntry
  allEntries: ColorEntry[]
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function SimilarColorsPopover({
  entry,
  allEntries,
  open,
  onOpenChange,
  children,
}: SimilarColorsPopoverProps) {
  const similar = useMemo(() => {
    const tokenized = allEntries.filter((e) => e.status === 'tokenized')

    return tokenized
      .map((t) => ({
        entry: t,
        distance: colorDistance(entry.value, t.value),
      }))
      .filter((r) => r.distance < Infinity)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
  }, [entry.value, allEntries])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="mb-2 text-xs font-semibold text-foreground">
          Similar existing tokens:
        </p>

        {similar.length === 0 ? (
          <p className="text-xs text-muted-foreground">No similar tokens found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {similar.map((item) => {
              const label = distanceLabel(item.distance)
              return (
                <div key={item.entry.id} className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: item.entry.value }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-foreground">
                      {item.entry.token}
                    </div>
                    <div className="flex items-baseline gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <span>{toHex(item.entry.value)}</span>
                      <span>
                        ΔE: {item.distance.toFixed(2)}
                        {label && (
                          <span className="ml-1 text-orange-600 dark:text-orange-400">
                            ({label})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
