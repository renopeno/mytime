import { parse, formatHex, converter, differenceEuclidean } from 'culori'

const toOklch = converter('oklch')
const oklchDistance = differenceEuclidean('oklch')

export type OklchColor = { l: number; c: number; h: number }

/** Parse any CSS color string (hex, oklch(), rgb()) to OKLCH components */
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
  return oklchDistance(parsedA, parsedB)
}

/** Get perceived lightness (0-1) for sorting. Higher = lighter. */
export function getLightness(colorStr: string): number {
  const oklch = parseToOklch(colorStr)
  return oklch?.l ?? 0
}

/** Convert any color to hex string for display */
export function toHex(colorStr: string): string {
  const parsed = parse(colorStr)
  if (!parsed) return colorStr
  return formatHex(parsed)
}

/** Qualitative label for color distance */
export function distanceLabel(d: number): string | null {
  if (d < 0.03) return 'very close'
  if (d < 0.06) return 'close'
  if (d < 0.10) return 'similar'
  return null
}
