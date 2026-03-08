import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Settings } from '@/types/app.types'
import { devGetSettings, devUpdateSettings } from '@/lib/dev-db'

const DEV = import.meta.env.DEV

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!user) return
    if (DEV) {
      setSettings(devGetSettings())
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setSettings(data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateSettings = async (updates: Partial<Pick<Settings, 'company_name' | 'default_hourly_rate' | 'rounding_mode' | 'daily_hours_target' | 'onboarding_completed'>>) => {
    if (!user || !settings) return
    if (DEV) {
      const data = devUpdateSettings(updates)
      setSettings(data)
      return { data, error: null }
    }
    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()
    if (!error && data) setSettings(data)
    return { data, error }
  }

  return { settings, loading, updateSettings, refetch: fetchSettings }
}
