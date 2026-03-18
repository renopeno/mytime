import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { format } from 'date-fns'
import { devGetTimeEntries } from '@/lib/dev-db'
import type { TimeEntryWithProject } from '@/types/app.types'

const DEV = import.meta.env.DEV

export interface DashboardFilters {
  from: Date
  to: Date
  projectIds?: string[]
  clientIds?: string[]
  billingStatus?: 'all' | 'not_paid' | 'invoice_sent' | 'paid'
}

export interface DashboardData {
  totalMinutes: number
  totalAmount: number
  workingDays: number
  billingBreakdown: {
    notPaid: number
    invoiceSent: number
    paid: number
  }
  byProject: Array<{ name: string; minutes: number; amount: number; color: string }>
  byClient: Array<{ name: string; minutes: number; amount: number }>
  entries: Array<{ date: string; durationMinutes: number; amount: number; isPaid: boolean; isInvoiced: boolean }>
  isLoading: boolean
}

const EMPTY_DATA: DashboardData = {
  totalMinutes: 0,
  totalAmount: 0,
  workingDays: 0,
  billingBreakdown: { notPaid: 0, invoiceSent: 0, paid: 0 },
  byProject: [],
  byClient: [],
  entries: [],
  isLoading: true,
}

export function useDashboardData(filters: DashboardFilters): DashboardData {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      setData((prev) => ({ ...prev, isLoading: true }))

      const startStr = format(filters.from, 'yyyy-MM-dd')
      const endStr = format(filters.to, 'yyyy-MM-dd')
      const defaultRate = settings?.default_hourly_rate ?? 0

      let rawEntries: TimeEntryWithProject[]

      if (DEV) {
        rawEntries = devGetTimeEntries({ startDate: startStr, endDate: endStr })
      } else {
        const { data: supaData, error } = await supabase
          .from('time_entries')
          .select('*, project:projects(*, client:clients(*))')
          .eq('user_id', user!.id)
          .gte('date', startStr)
          .lte('date', endStr)
        if (error || !supaData) {
          setData((prev) => ({ ...prev, isLoading: false }))
          return
        }
        rawEntries = supaData as TimeEntryWithProject[]
      }

      // Apply filters
      let entries = rawEntries

      if (filters.projectIds && filters.projectIds.length > 0) {
        const ids = new Set(filters.projectIds)
        entries = entries.filter((e) => e.project_id != null && ids.has(e.project_id))
      }

      if (filters.clientIds && filters.clientIds.length > 0) {
        const ids = new Set(filters.clientIds)
        entries = entries.filter((e) => e.project?.client?.id != null && ids.has(e.project!.client!.id))
      }

      if (filters.billingStatus && filters.billingStatus !== 'all') {
        switch (filters.billingStatus) {
          case 'not_paid':
            entries = entries.filter((e) => !e.is_paid && !e.is_invoiced)
            break
          case 'invoice_sent':
            entries = entries.filter((e) => e.is_invoiced && !e.is_paid)
            break
          case 'paid':
            entries = entries.filter((e) => e.is_paid)
            break
        }
      }

      // Aggregate
      let totalMinutes = 0
      let totalAmount = 0
      const uniqueDates = new Set<string>()
      const billingBreakdown = { notPaid: 0, invoiceSent: 0, paid: 0 }

      const projectMap = new Map<string, { name: string; minutes: number; amount: number; color: string }>()
      const clientMap = new Map<string, { name: string; minutes: number; amount: number }>()
      const entryList: DashboardData['entries'] = []

      for (const entry of entries) {
        const minutes = entry.duration_minutes ?? 0
        const project = entry.project
        const effectiveRate = project?.hourly_rate ?? defaultRate
        const amount = (minutes / 60) * effectiveRate

        totalMinutes += minutes
        totalAmount += amount
        uniqueDates.add(entry.date)

        // Billing breakdown
        if (entry.is_paid) {
          billingBreakdown.paid += amount
        } else if (entry.is_invoiced) {
          billingBreakdown.invoiceSent += amount
        } else {
          billingBreakdown.notPaid += amount
        }

        // By project
        const projectName = project?.name ?? 'No Project'
        const projectColor = project?.color ?? ''
        const existing = projectMap.get(projectName)
        if (existing) {
          existing.minutes += minutes
          existing.amount += amount
        } else {
          projectMap.set(projectName, { name: projectName, minutes, amount, color: projectColor })
        }

        // By client
        const clientName = project?.client?.name ?? 'No Client'
        const existingClient = clientMap.get(clientName)
        if (existingClient) {
          existingClient.minutes += minutes
          existingClient.amount += amount
        } else {
          clientMap.set(clientName, { name: clientName, minutes, amount })
        }

        // Individual entries
        entryList.push({
          date: entry.date,
          durationMinutes: minutes,
          amount,
          isPaid: entry.is_paid,
          isInvoiced: entry.is_invoiced,
        })
      }

      setData({
        totalMinutes,
        totalAmount,
        workingDays: uniqueDates.size,
        billingBreakdown,
        byProject: Array.from(projectMap.values()),
        byClient: Array.from(clientMap.values()),
        entries: entryList,
        isLoading: false,
      })
    }

    fetchData()
  }, [user, filters.from.getTime(), filters.to.getTime(), filters.projectIds?.join(','), filters.clientIds?.join(','), filters.billingStatus, settings])

  return data
}
