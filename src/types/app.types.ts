import type { Database } from './database.types'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type Settings = Tables<'settings'>
export type Client = Tables<'clients'>
export type Project = Tables<'projects'>
export type TimeEntry = Tables<'time_entries'>

export type RoundingMode = 'none' | '30min' | '60min'

export type ProjectType = 'web_design' | 'product_design' | 'deck_design' | 'webshop'

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'web_design', label: 'Web Design' },
  { value: 'product_design', label: 'Product Design' },
  { value: 'deck_design', label: 'Deck Design' },
  { value: 'webshop', label: 'Webshop' },
]

export function getProjectTypeLabel(type: string): string {
  return PROJECT_TYPES.find((t) => t.value === type)?.label ?? type
}

/** Project with its joined client */
export type ProjectWithClient = Project & { client: Client | null }

/** Time entry with its joined project (and the project's client) */
export type TimeEntryWithProject = TimeEntry & {
  project: ProjectWithClient | null
}
