import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Client } from '@/types/app.types'
import { devGetClients, devCreateClient, devUpdateClient, devDeleteClient } from '@/lib/dev-db'

const DEV = import.meta.env.DEV

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    if (DEV) {
      setClients(devGetClients())
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    setClients(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchClients() }, [fetchClients])

  const createClient = async (client: { name: string; color: string; hourly_rate?: number | null }) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    if (DEV) {
      const data = devCreateClient({ ...client, user_id: user.id, hourly_rate: client.hourly_rate ?? null, is_active: true })
      await fetchClients()
      return { data, error: null }
    }
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, user_id: user.id })
      .select()
      .single()
    if (!error) await fetchClients()
    return { data, error }
  }

  const updateClient = async (id: string, updates: Partial<Pick<Client, 'name' | 'color' | 'hourly_rate' | 'is_active'>>) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    if (DEV) {
      devUpdateClient(id, updates)
      await fetchClients()
      return { data: null, error: null }
    }
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) await fetchClients()
    return { data: null, error }
  }

  const deleteClient = async (id: string, cascade = false) => {
    if (!user) return { error: new Error('Not authenticated') }
    if (DEV) {
      devDeleteClient(id, cascade)
      await fetchClients()
      return { error: null }
    }

    if (cascade) {
      // Find projects belonging to this client
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', id)
        .eq('user_id', user.id)
      const projectIds = (projects ?? []).map(p => p.id)

      if (projectIds.length > 0) {
        // Delete time entries for those projects
        await supabase.from('time_entries').delete().in('project_id', projectIds).eq('user_id', user.id)
        // Delete the projects
        await supabase.from('projects').delete().in('id', projectIds).eq('user_id', user.id)
      }
    } else {
      // Nullify client_id on projects
      await supabase.from('projects').update({ client_id: null }).eq('client_id', id).eq('user_id', user.id)
    }

    const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user.id)
    if (!error) await fetchClients()
    return { error }
  }

  return { clients, loading, createClient, updateClient, deleteClient, refetch: fetchClients }
}
