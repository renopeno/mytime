import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { TimeEntryWithProject } from '@/types/app.types'
import { devGetTimeEntries, devCreateTimeEntry, devUpdateTimeEntry, devDeleteTimeEntry, devBulkUpdateTimeEntries } from '@/lib/dev-db'

const DEV = import.meta.env.DEV

interface FetchOptions {
  startDate?: string
  endDate?: string
  projectId?: string
  isPaid?: boolean
  isInvoiced?: boolean
}

export function useTimeEntries(options: FetchOptions = {}) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    if (!user) return
    setLoading(true)

    if (DEV) {
      setEntries(devGetTimeEntries(options))
      setLoading(false)
      return
    }

    let query = supabase
      .from('time_entries')
      .select('*, project:projects(*, client:clients(*))')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (options.startDate) query = query.gte('date', options.startDate)
    if (options.endDate)   query = query.lte('date', options.endDate)
    if (options.projectId) query = query.eq('project_id', options.projectId)
    if (options.isPaid !== undefined)     query = query.eq('is_paid', options.isPaid)
    if (options.isInvoiced !== undefined) query = query.eq('is_invoiced', options.isInvoiced)

    const { data } = await query
    setEntries((data as TimeEntryWithProject[]) ?? [])
    setLoading(false)
  }, [user, options.startDate, options.endDate, options.projectId, options.isPaid, options.isInvoiced])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const createEntry = async (entry: {
    project_id?: string | null
    description: string
    date: string
    duration_minutes: number
  }) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    if (DEV) {
      const data = devCreateTimeEntry({ ...entry, user_id: user.id, project_id: entry.project_id ?? null, description: entry.description, is_paid: false, is_invoiced: false })
      await fetchEntries()
      return { data, error: null }
    }
    const { data, error } = await supabase
      .from('time_entries')
      .insert({ ...entry, user_id: user.id })
      .select('*, project:projects(*, client:clients(*))')
      .single()
    if (!error) await fetchEntries()
    return { data, error }
  }

  const updateEntry = async (id: string, updates: {
    project_id?: string | null
    description?: string
    date?: string
    duration_minutes?: number
    is_paid?: boolean
    is_invoiced?: boolean
  }) => {
    if (DEV) {
      const data = devUpdateTimeEntry(id, updates)
      await fetchEntries()
      return { data, error: null }
    }
    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select('*, project:projects(*, client:clients(*))')
      .single()
    if (!error) await fetchEntries()
    return { data, error }
  }

  const deleteEntry = async (id: string) => {
    if (DEV) {
      devDeleteTimeEntry(id)
      await fetchEntries()
      return { error: null }
    }
    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (!error) await fetchEntries()
    return { error }
  }

  const duplicateEntry = async (entry: TimeEntryWithProject, newDate?: string) => {
    return createEntry({
      project_id: entry.project_id,
      description: entry.description,
      date: newDate ?? entry.date,
      duration_minutes: entry.duration_minutes,
    })
  }

  const bulkUpdatePaid = async (ids: string[], isPaid: boolean) => {
    const updates = isPaid ? { is_paid: true, is_invoiced: true } : { is_paid: false }
    if (DEV) {
      devBulkUpdateTimeEntries(ids, updates)
      await fetchEntries()
      return { error: null }
    }
    const { error } = await supabase.from('time_entries').update(updates).in('id', ids)
    if (!error) await fetchEntries()
    return { error }
  }

  const bulkUpdateInvoiced = async (ids: string[], isInvoiced: boolean) => {
    if (DEV) {
      devBulkUpdateTimeEntries(ids, { is_invoiced: isInvoiced })
      await fetchEntries()
      return { error: null }
    }
    const { error } = await supabase.from('time_entries').update({ is_invoiced: isInvoiced }).in('id', ids)
    if (!error) await fetchEntries()
    return { error }
  }

  return {
    entries,
    loading,
    createEntry,
    updateEntry,
    deleteEntry,
    duplicateEntry,
    bulkUpdatePaid,
    bulkUpdateInvoiced,
    refetch: fetchEntries,
  }
}
