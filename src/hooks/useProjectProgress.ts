import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { devGetProjectLoggedMinutes } from '@/lib/dev-db'

const DEV = import.meta.env.DEV

export function useProjectProgress() {
  const { user } = useAuth()
  const [loggedMinutes, setLoggedMinutes] = useState<Map<string, number>>(new Map())

  const fetch = useCallback(async () => {
    if (!user) return
    if (DEV) {
      setLoggedMinutes(devGetProjectLoggedMinutes())
      return
    }
    const { data } = await (supabase as any)
      .rpc('get_project_logged_minutes', { p_user_id: user.id })
    if (data) {
      const map = new Map<string, number>()
      for (const row of data as { project_id: string; total_minutes: number }[]) {
        map.set(row.project_id, row.total_minutes)
      }
      setLoggedMinutes(map)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  return { loggedMinutes, refetch: fetch }
}
