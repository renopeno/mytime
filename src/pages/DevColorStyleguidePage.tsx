import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { colorRegistry, type ColorCategory, type ColorEntry } from '@/lib/color-registry'
import { getLightness } from '@/lib/color-utils'
import { ColorSwatchCard } from '@/components/dev/ColorSwatchCard'
import { SimilarColorsPopover } from '@/components/dev/SimilarColorsPopover'

type Filter = 'all' | 'tokenized' | 'unresolved'

const CATEGORY_ORDER: ColorCategory[] = [
  'core',
  'status',
  'form',
  'chart',
  'client-palette',
  'progress',
  'pdf',
  'brand',
]

const CATEGORY_LABELS: Record<ColorCategory, string> = {
  core: 'Core',
  status: 'Status',
  form: 'Form',
  chart: 'Chart',
  'client-palette': 'Client Palette',
  progress: 'Progress',
  pdf: 'PDF',
  brand: 'Brand',
}

export default function DevColorStyleguidePage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const tokenized = colorRegistry.filter((e) => e.status === 'tokenized').length
    const unresolved = colorRegistry.filter((e) => e.status === 'unresolved').length
    return { tokenized, unresolved }
  }, [])

  const grouped = useMemo(() => {
    const filtered = colorRegistry.filter((entry) => {
      if (filter === 'tokenized') return entry.status === 'tokenized'
      if (filter === 'unresolved') return entry.status === 'unresolved'
      return true
    })

    const groups = new Map<ColorCategory, ColorEntry[]>()
    for (const entry of filtered) {
      const list = groups.get(entry.category) ?? []
      list.push(entry)
      groups.set(entry.category, list)
    }

    // Sort within each group by lightness (lightest first)
    for (const [, entries] of groups) {
      entries.sort((a, b) => getLightness(b.value) - getLightness(a.value))
    }

    return groups
  }, [filter])

  function handleSwatchClick(entry: ColorEntry) {
    if (entry.status === 'tokenized' && entry.token) {
      navigator.clipboard.writeText(`var(${entry.token})`)
      toast.success(`Copied var(${entry.token})`)
    }
    // Unresolved: popover handles itself via open state
  }

  return (
    <div className="min-h-screen bg-white">
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Button>

        <div>
          <h1 className="font-serif text-2xl font-normal">Color Styleguide</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-primary">{stats.tokenized}</span> tokenized
            {' · '}
            <span className="font-medium text-orange-600">{stats.unresolved}</span> unresolved
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5">
          {(['all', 'tokenized', 'unresolved'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Groups */}
      {CATEGORY_ORDER.map((category) => {
        const entries = grouped.get(category)
        if (!entries?.length) return null

        return (
          <section key={category}>
            <h2 className="mb-3 border-b border-border pb-1.5 text-sm font-semibold text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {entries.map((entry) =>
                entry.status === 'unresolved' ? (
                  <SimilarColorsPopover
                    key={entry.id}
                    entry={entry}
                    allEntries={colorRegistry}
                    open={openPopoverId === entry.id}
                    onOpenChange={(open) =>
                      setOpenPopoverId(open ? entry.id : null)
                    }
                  >
                    <ColorSwatchCard
                      entry={entry}
                      onClick={() => setOpenPopoverId(entry.id)}
                    />
                  </SimilarColorsPopover>
                ) : (
                  <ColorSwatchCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => handleSwatchClick(entry)}
                  />
                ),
              )}
            </div>
          </section>
        )
      })}
    </div>
    </div>
  )
}
