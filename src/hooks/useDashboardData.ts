import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { format, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { devGetTimeEntries } from '@/lib/dev-db'

const DEV = import.meta.env.DEV

type Period = 'today' | 'week' | 'month'

interface ProjectEntry {
  name: string
  minutes: number
  color: string
  amount: number
}

interface ClientEntry {
  name: string
  minutes: number
  color: string
  amount: number
}

interface DailyEntry {
  date: string
  minutes: number
}

interface DashboardData {
  totalMinutes: number
  totalAmount: number
  entryCount: number
  byProject: ProjectEntry[]
  byClient: ClientEntry[]
  dailyData: DailyEntry[]
  loading: boolean
}

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date()

  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

export function useDashboardData(period: Period): DashboardData {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [data, setData] = useState<DashboardData>({
    totalMinutes: 0,
    totalAmount: 0,
    entryCount: 0,
    byProject: [],
    byClient: [],
    dailyData: [],
    loading: true,
  })

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      setData((prev) => ({ ...prev, loading: true }))

      const { start, end } = getDateRange(period)
      const defaultRate = settings?.default_hourly_rate ?? 0

      let entries
      if (DEV) {
        entries = devGetTimeEntries({ startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') })
      } else {
        const { data, error } = await supabase
          .from('time_entries')
          .select('*, project:projects(*, client:clients(*))')
          .eq('user_id', user!.id)
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'))
        if (error || !data) {
          setData((prev) => ({ ...prev, loading: false }))
          return
        }
        entries = data
      }

      let totalMinutes = 0
      let totalAmount = 0
      const entryCount = entries.length

      const projectMap = new Map<string, ProjectEntry>()
      const clientMap = new Map<string, ClientEntry>()
      const dailyMap = new Map<string, number>()

      // Initialize daily map with all days in the range
      const allDays = eachDayOfInterval({ start, end })
      for (const day of allDays) {
        dailyMap.set(format(day, 'dd.MM'), 0)
      }

      for (const entry of entries) {
        const minutes = entry.duration_minutes ?? 0
        const project = entry.project as { id: string; name: string; color: string; hourly_rate: number | null; client: { id: string; name: string; color: string } | null } | null
        const effectiveRate = project?.hourly_rate ?? defaultRate
        const amount = (minutes / 60) * effectiveRate

        totalMinutes += minutes
        totalAmount += amount

        // Aggregate by project
        const projectName = project?.name ?? 'No Project'
        const projectColor = project?.color ?? ''

        if (projectMap.has(projectName)) {
          const existing = projectMap.get(projectName)!
          existing.minutes += minutes
          existing.amount += amount
        } else {
          projectMap.set(projectName, {
            name: projectName,
            minutes,
            color: projectColor,
            amount,
          })
        }

        // Aggregate by client
        const client = project?.client as { id: string; name: string; color: string } | null
        const clientName = client?.name ?? 'No Client'
        const clientColor = client?.color ?? ''

        if (clientMap.has(clientName)) {
          const existing = clientMap.get(clientName)!
          existing.minutes += minutes
          existing.amount += amount
        } else {
          clientMap.set(clientName, {
            name: clientName,
            minutes,
            color: clientColor,
            amount,
          })
        }

        // Aggregate by day
        const dayKey = format(new Date(entry.date), 'dd.MM')
        dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + minutes)
      }

      setData({
        totalMinutes,
        totalAmount,
        entryCount,
        byProject: Array.from(projectMap.values()),
        byClient: Array.from(clientMap.values()),
        dailyData: Array.from(dailyMap.entries()).map(([date, minutes]) => ({ date, minutes })),
        loading: false,
      })
    }

    fetchData()
  }, [user, period, settings])

  return data
}
