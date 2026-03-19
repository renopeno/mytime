import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { colorRegistry, type ColorCategory, type ColorEntry } from '@/lib/color-registry'
import { getLightness } from '@/lib/color-utils'
import { ColorSwatchCard } from '@/components/dev/ColorSwatchCard'
import { SimilarColorsPopover } from '@/components/dev/SimilarColorsPopover'

type Filter = 'all' | 'tokenized' | 'unresolved'

const CATEGORY_ORDER: ColorCategory[] = [
  'primitive',
  'core',
  'status',
  'chart',
  'client-palette',
  'progress',
  'pdf',
]

const CATEGORY_LABELS: Record<ColorCategory, string> = {
  primitive: 'Primitive Scale',
  core: 'Core (Semantic)',
  status: 'Status',
  chart: 'Chart',
  'client-palette': 'Client Palette',
  progress: 'Progress',
  pdf: 'PDF',
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
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-4">
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

        {/* Filter tabs — same component as other pages */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tokenized">Tokenized</TabsTrigger>
            <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Groups */}
      {CATEGORY_ORDER.map((category) => {
        const entries = grouped.get(category)
        if (!entries?.length) return null

        return (
          <section key={category} className="space-y-4">
            <h2 className="font-serif text-lg text-foreground">
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
  )
}
