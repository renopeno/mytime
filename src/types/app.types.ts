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


/** Project with its joined client */
export type ProjectWithClient = Project & { client: Client | null }

/** Time entry with its joined project (and the project's client) */
export type TimeEntryWithProject = TimeEntry & {
  project: ProjectWithClient | null
}
