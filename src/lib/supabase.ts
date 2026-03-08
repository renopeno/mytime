import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const envUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const supabaseUrl = envUrl.startsWith('http') ? envUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = (envKey.startsWith('ey') || envKey.startsWith('sb_')) ? envKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.abc'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
