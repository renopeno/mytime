# Color Styleguide — Design Spec

## Problem

The project has ~35 well-defined CSS variable tokens but ~30+ hardcoded hex colors scattered across components. There is no visibility into which colors are tokenized vs hardcoded, making it hard to maintain consistency and clean up technical debt.

## Solution

A developer-facing Color Styleguide page accessible in dev mode, backed by a static color registry file that serves as the single source of truth for all colors in the project.

## Architecture

### 1. Color Registry — `src/lib/color-registry.ts`

A single TypeScript file exporting an array of color entries:

```ts
export type ColorStatus = "tokenized" | "unresolved"

export type ColorCategory =
  | "core"           // background, foreground, primary, secondary, accent, muted, destructive
  | "status"         // paid, invoiced, not-paid
  | "form"           // dialog bg, input bg, form borders
  | "chart"          // chart-1 through chart-5 + report chart colors
  | "client-palette" // 12 assignable client colors
  | "progress"       // progress bar fills (empty, overtime)
  | "pdf"            // PDF export grays
  | "brand"          // Google logo, external brand colors

export type ColorEntry = {
  id: string              // unique kebab-case key, e.g. "form-border"
  value: string           // resolved color value, e.g. "#eae3dc" or "oklch(0.36 0.05 163)"
  token: string | null    // CSS variable name if tokenized, e.g. "--primary". null if hardcoded
  tailwindClass: string | null // Tailwind class if mapped, e.g. "primary". null if not
  category: ColorCategory
  label: string           // human-readable, e.g. "Form Border"
  usedIn: string[]        // file names, e.g. ["dialog.tsx", "input.tsx"]
  status: ColorStatus
}

export const colorRegistry: ColorEntry[] = [
  // ... all ~70 entries
]
```

**Key points:**
- This file is data only — not imported by any production component
- Contains every color from the audit: both tokenized and hardcoded
- The `usedIn` field lists component filenames (not full paths) for brevity

### 2. Route — `/dev/colors`

Lazy-loaded route, only registered when `import.meta.env.DEV` is true.

### 3. Entry Point — Settings Page

A "Color Styleguide" button with a palette icon in the existing Development section of SettingsPage. Navigates to `/dev/colors`.

### 4. Page Layout

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Settings          Color Styleguide       │
│                                                     │
│  42 tokenized  ·  28 unresolved                     │
│  [All] [Tokenized] [Unresolved]                     │
│                                                     │
│  ── Core ──────────────────────────────────────────  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │      │ │      │ │      │ │      │ │      │      │
│  │ color│ │ color│ │ color│ │ color│ │ color│      │
│  │      │ │      │ │      │ │      │ │      │      │
│  ├──────┤ ├──────┤ ├──────┤ ├──────┤ ├──────┤      │
│  │label │ │label │ │label │ │label │ │label │      │
│  │#hex  │ │#hex  │ │#hex  │ │#hex  │ │#hex  │      │
│  │--tok │ │--tok │ │UNRES.│ │--tok │ │UNRES.│      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                     │
│  ── Form ──────────────────────────────────────────  │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

### 5. Swatch Card

Each card is ~160×160px:

- **Top ~105px:** Solid color fill, rounded top corners
- **Bottom ~55px:** White/card background with:
  - Label (bold, small)
  - Hex value (monospace, muted)
  - Token name if tokenized (monospace, small, `--primary`)
  - Orange "unresolved" badge if hardcoded
- **Border:** Subtle border around entire card. For very light colors, ensure the color block has a faint inner border so it doesn't blend with the background.

### 6. Sorting Within Groups

Colors within each category are sorted by perceived lightness:
- Parse hex to HSL, sort by L value (lightest first, left to right)
- For OKLCH values, use the L channel directly
- This creates a natural gradient within each group

### 7. Similar Colors Popover

Clicking an **unresolved** swatch opens a popover showing:

```
┌─────────────────────────────┐
│  Similar existing tokens:   │
│                             │
│  ■ --muted       #E9E2DB   │
│    ΔE: 0.02  (very close)  │
│                             │
│  ■ --border      oklch(…)  │
│    ΔE: 0.05                │
│                             │
│  ■ --sidebar     #F0EAE4   │
│    ΔE: 0.08                │
│                             │
└─────────────────────────────┘
```

- Shows top 5 closest tokenized colors
- Distance calculated via Euclidean distance in OKLCH space
- For hex values, convert to OKLCH first (using a lightweight conversion util)
- Shows a qualitative label: "very close" (ΔE < 0.03), "close" (< 0.06), "similar" (< 0.10)

### 8. Color Parsing Utility

A small utility (`src/lib/color-utils.ts`) that:
- Converts hex → OKLCH (for distance calculation and lightness sorting)
- Calculates OKLCH Euclidean distance between two colors
- Parses `oklch(L C H)` strings back to numeric values

This is dev-only code, doesn't need to be production-optimized.

## CLAUDE.md Instruction

Add to CLAUDE.md:

```
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

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/color-registry.ts` | **Create** — color data registry (~70 entries) |
| `src/lib/color-utils.ts` | **Create** — hex↔oklch conversion, distance calc |
| `src/pages/DevColorStyleguidePage.tsx` | **Create** — the styleguide page component |
| `src/App.tsx` (or router config) | **Modify** — add lazy `/dev/colors` route (DEV only) |
| `src/pages/SettingsPage.tsx` | **Modify** — add "Color Styleguide" button in Development section |
| `CLAUDE.md` | **Modify** — add Color Registry instructions |

## Out of Scope

- Auto-refactoring components (done manually via Claude Code when needed)
- Dark mode preview toggle on the page (uses whatever mode the app is in)
- Export/import of registry
- Production bundle inclusion (all dev-only, tree-shaken out)
