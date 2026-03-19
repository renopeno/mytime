# Color Styleguide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a developer-facing Color Styleguide page that inventories all colors in the project, flags hardcoded ones as "unresolved", and shows similar existing tokens for cleanup.

**Architecture:** Static color registry file (`color-registry.ts`) as data source → React page at `/dev/colors` renders grouped/sorted swatches → `culori` library handles color math → CLAUDE.md instruction ensures registry maintenance.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, culori (dev dep), shadcn/ui Card/Popover components, react-router

**Spec:** `docs/superpowers/specs/2026-03-19-color-styleguide-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/color-registry.ts` | Static array of all ~65 ColorEntry objects with types |
| `src/lib/color-utils.ts` | Hex/OKLCH parsing, conversion via culori, distance calculation, lightness sorting |
| `src/pages/DevColorStyleguidePage.tsx` | Page component: grouped swatch grid, filter bar, summary stats |
| `src/components/dev/ColorSwatchCard.tsx` | Single 160×160px swatch card with color block + metadata |
| `src/components/dev/SimilarColorsPopover.tsx` | Popover showing top 5 closest tokenized colors for unresolved entries |
| `src/components/settings/DevSettings.tsx` | **Modify** — add "Color Styleguide" nav button |
| `src/App.tsx` | **Modify** — add lazy dev-only route |
| `CLAUDE.md` | **Create** — project instructions with Color Registry section |

---

## Task 1: Install culori + create color-utils.ts

**Files:**
- Modify: `package.json`
- Create: `src/lib/color-utils.ts`

- [ ] **Step 1: Install culori as dev dependency**

```bash
npm install -D culori
```

- [ ] **Step 2: Create color-utils.ts**

Create `src/lib/color-utils.ts` with these exports:

```ts
import { parse, converter, differenceEuclidean } from 'culori'

const toOklch = converter('oklch')

export type OklchColor = { l: number; c: number; h: number }

/** Parse any CSS color string (hex, oklch(), rgb()) to OKLCH */
export function parseToOklch(colorStr: string): OklchColor | null {
  const parsed = parse(colorStr)
  if (!parsed) return null
  const oklch = toOklch(parsed)
  return { l: oklch.l ?? 0, c: oklch.c ?? 0, h: oklch.h ?? 0 }
}

/** Euclidean distance in OKLCH space (lower = more similar) */
export function colorDistance(a: string, b: string): number {
  const parsedA = parse(a)
  const parsedB = parse(b)
  if (!parsedA || !parsedB) return Infinity
  return differenceEuclidean('oklch')(parsedA, parsedB)
}

/** Get perceived lightness (0-1) for sorting. Higher = lighter. */
export function getLightness(colorStr: string): number {
  const oklch = parseToOklch(colorStr)
  return oklch?.l ?? 0
}

/** Convert any color to hex string for display */
export function toHexString(colorStr: string): string {
  const parsed = parse(colorStr)
  if (!parsed) return colorStr
  const { formatHex } = require('culori') // tree-shaken in prod
  return formatHex(parsed)
}
```

Note: Use proper ESM imports for `formatHex` — the require is pseudocode, actual implementation should use `import { formatHex } from 'culori'`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/color-utils.ts
git commit -m "feat: add color-utils with culori for OKLCH conversion and distance"
```

---

## Task 2: Create color-registry.ts

**Files:**
- Create: `src/lib/color-registry.ts`

- [ ] **Step 1: Create the registry file with types and all entries**

Create `src/lib/color-registry.ts` with the `ColorEntry` type and full array. Reference the audit in the spec for all values.

The types:

```ts
export type ColorStatus = "tokenized" | "unresolved"

export type ColorCategory =
  | "core"
  | "status"
  | "form"
  | "chart"
  | "client-palette"
  | "progress"
  | "pdf"
  | "brand"

export type ColorEntry = {
  id: string
  value: string           // light-mode value
  token: string | null    // CSS var name, e.g. "--primary"
  tailwindClass: string | null
  category: ColorCategory
  label: string
  usedIn: string[]
  status: ColorStatus
}
```

Populate `colorRegistry` array with ALL entries from the audit. Group entries by category in the source code for readability. Key entries to include:

**Core (~22 entries):** background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, accent, accent-foreground, muted, muted-foreground, destructive, border, input, ring, sidebar, sidebar-foreground, sidebar-primary, sidebar-primary-foreground, sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring

**Status (3):** status-paid (#45825d), status-invoiced (#fddd74), status-not-paid (#e1d4c0)

**Chart tokenized (5):** chart-1 through chart-5

**Chart unresolved (~8):** The hardcoded report colors from ReportsPage.tsx: #6366f1, #f59e0b, #10b981, #ef4444, #8b5cf6, #ec4899, #14b8a6, #f97316, #3b82f6, #84cc16, #c4b5a0

**Form unresolved (~5):** #eae3dc (border), #f9f4ef (dialog bg), #f4efea (dialog footer), #f9f5f0 (input bg), #f0eae4 (group header bg)

**Client palette (12):** All from color-swatch-picker.tsx: #ed3838, #f97316, #f6b03a, #96c46e, #14b8b8, #0ea5e9, #5b8bfc, #7663f7, #b35cf6, #f155ab, #6789b9, #000000

**Progress unresolved (2):** #c8c8c8 (empty), #C75042 (overtime)

**PDF unresolved (6):** #666, #888, #f5f5f5, #999, #333, #eee

**Brand (4):** Google logo: #4285F4, #34A853, #FBBC05, #EA4335

**Other unresolved:** #c5b99b (step indicator), #f989e4 (new badge), #ede8df (upload area), #fdf5ed & #d6cec6 (gradient), #F0EAE4 (body bg)

- [ ] **Step 2: Commit**

```bash
git add src/lib/color-registry.ts
git commit -m "feat: add color registry with full audit of ~65 color entries"
```

---

## Task 3: Create ColorSwatchCard component

**Files:**
- Create: `src/components/dev/ColorSwatchCard.tsx`

- [ ] **Step 1: Create the swatch card component**

Props: `{ entry: ColorEntry, onClick: () => void }`

Structure:
- Outer container: ~160×160px, rounded-lg, border border-border, overflow-hidden, cursor-pointer
- Top section (~105px): `div` with `style={{ backgroundColor: entry.value }}`. For very light colors (lightness > 0.9), add an inner `ring-1 ring-inset ring-black/5` so they don't blend with the page.
- Bottom section (~55px): bg-card padding with:
  - Label: `text-xs font-semibold truncate`
  - Hex value: `text-[10px] font-mono text-muted-foreground`
  - If tokenized: token name in `text-[10px] font-mono text-primary`
  - If unresolved: orange badge `bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full` with text "unresolved"

For tokenized entries, read the live computed value via a small hook that calls `getComputedStyle(document.documentElement).getPropertyValue(entry.token)` so the swatch shows the correct color for the current theme mode.

- [ ] **Step 2: Commit**

```bash
git add src/components/dev/ColorSwatchCard.tsx
git commit -m "feat: add ColorSwatchCard component for styleguide"
```

---

## Task 4: Create SimilarColorsPopover component

**Files:**
- Create: `src/components/dev/SimilarColorsPopover.tsx`

- [ ] **Step 1: Create the popover component**

Props: `{ entry: ColorEntry, allEntries: ColorEntry[], open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }`

Uses shadcn `Popover` + `PopoverTrigger` + `PopoverContent`.

Logic:
1. Filter `allEntries` to only tokenized ones
2. For each, calculate `colorDistance(entry.value, tokenized.value)` using color-utils
3. Sort by distance ascending, take top 5
4. Display each with:
   - Small 20×20 color swatch circle
   - Token name (e.g. `--muted`)
   - Hex value
   - Distance with label: `ΔE: 0.02 (very close)` / `ΔE: 0.05 (close)` / `ΔE: 0.08 (similar)`
   - Thresholds: < 0.03 = "very close", < 0.06 = "close", < 0.10 = "similar", else no label

Memoize the distance calculations with `useMemo` since they're expensive.

- [ ] **Step 2: Commit**

```bash
git add src/components/dev/SimilarColorsPopover.tsx
git commit -m "feat: add SimilarColorsPopover with OKLCH distance matching"
```

---

## Task 5: Create DevColorStyleguidePage

**Files:**
- Create: `src/pages/DevColorStyleguidePage.tsx`

- [ ] **Step 1: Create the page component**

Imports: `colorRegistry` from color-registry, `getLightness` from color-utils, `ColorSwatchCard`, `SimilarColorsPopover`, shadcn Button, and `useNavigate` from react-router.

**Header section:**
- Back button: `← Back to Settings` using `navigate('/settings')`
- Title: "Color Styleguide" in the same heading style as other pages
- Summary stats: `{tokenized} tokenized · {unresolved} unresolved` — count from registry
- Filter pills: three buttons `[All] [Tokenized] [Unresolved]` — local state `filter: 'all' | 'tokenized' | 'unresolved'`

**Body:**
- Group entries by `category`
- Category display order: core, status, form, chart, client-palette, progress, pdf, brand
- Category headings: capitalize + human-readable (e.g. "Client Palette", "PDF")
- Within each group: sort by `getLightness(entry.value)` descending (lightest first)
- Apply filter: if `tokenized`, show only `status === 'tokenized'`; if `unresolved`, only `status === 'unresolved'`; skip empty groups after filtering
- Render grid of `ColorSwatchCard` components: `grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3`

**Click handling:**
- Tokenized card click: copy `var(${entry.token})` to clipboard via `navigator.clipboard.writeText()`, show `toast.success('Copied var(--primary)')`
- Unresolved card click: open `SimilarColorsPopover` for that entry

Use `useState` for which popover is open (track by entry id).

- [ ] **Step 2: Commit**

```bash
git add src/pages/DevColorStyleguidePage.tsx
git commit -m "feat: add DevColorStyleguidePage with grouped swatches and filtering"
```

---

## Task 6: Wire up route and settings button

**Files:**
- Modify: `src/App.tsx` (lines 16, 78)
- Modify: `src/components/settings/DevSettings.tsx`

- [ ] **Step 1: Add lazy import and route to App.tsx**

After line 16 (the `SettingsPage` lazy import), add:

```ts
const DevColorStyleguidePage = lazy(() => import('@/pages/DevColorStyleguidePage'))
```

After line 78 (the settings route), add a dev-only route:

```ts
...(import.meta.env.DEV ? [
  { path: 'dev/colors', element: <SuspenseWrapper><DevColorStyleguidePage /></SuspenseWrapper> },
] : []),
```

- [ ] **Step 2: Add button to DevSettings.tsx**

Add `Palette` icon import from lucide-react. Add `useNavigate` from react-router.

In `CardContent`, add a second button next to "Reset onboarding":

```tsx
<div className="flex flex-wrap gap-2">
  <Button variant="outline" size="sm" onClick={resetOnboarding}>
    Reset onboarding
  </Button>
  <Button variant="outline" size="sm" onClick={() => navigate('/dev/colors')}>
    <Palette className="mr-1.5 h-3.5 w-3.5" />
    Color Styleguide
  </Button>
</div>
```

- [ ] **Step 3: Verify the route works**

Run dev server, go to Settings, click "Color Styleguide" button, confirm the page loads with swatches.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/settings/DevSettings.tsx
git commit -m "feat: wire up /dev/colors route and add styleguide button to DevSettings"
```

---

## Task 7: Create CLAUDE.md with color registry instructions

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md at project root**

```markdown
# MyTimeTracker — Development Instructions

## Color Registry

When adding a new color (hex, rgb, oklch) to any component:
1. Add an entry to `src/lib/color-registry.ts`
2. If the color uses an existing CSS variable → status: "tokenized"
3. If the color is hardcoded → status: "unresolved"
4. Set the correct category, label, and usedIn fields

When tokenizing a previously hardcoded color:
1. Add the CSS variable to `src/index.css` (both light and dark mode)
2. Add the Tailwind mapping in the `@theme inline` block
3. Replace hardcoded values in components with the token
4. Update the registry entry: set token, tailwindClass, status: "tokenized"
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with color registry maintenance instructions"
```

---

## Task 8: Visual polish and edge case fixes

**Files:**
- Modify: `src/pages/DevColorStyleguidePage.tsx`
- Modify: `src/components/dev/ColorSwatchCard.tsx`

- [ ] **Step 1: Run dev server and check the page visually**

Open `/dev/colors` and verify:
- All ~65 swatches render correctly
- Colors within groups flow light→dark left to right
- Unresolved badges are visible
- Filter buttons work
- Clicking tokenized swatch copies to clipboard
- Clicking unresolved swatch shows similar colors popover
- Very light colors (#f9f5f0, #fdf5ed) have visible borders
- Page scrolls well with all categories

- [ ] **Step 2: Fix any visual/layout issues found**

Likely fixes: adjust grid gap, card sizing on mobile, popover positioning, empty state when filter shows no results for a category.

- [ ] **Step 3: Final commit**

```bash
git add -u
git commit -m "fix: visual polish for color styleguide page"
```
