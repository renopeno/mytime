import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { toast } from 'sonner'
import { Download, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProjectSelect } from '@/components/projects/ProjectSelect'
import { ClientSelect } from '@/components/clients/ClientSelect'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useSettings } from '@/hooks/useSettings'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatDuration, formatDecimalHours } from '@/lib/duration'
import { formatDate, formatCurrency, formatMonthYear } from '@/lib/format'
import { exportToCSV } from '@/lib/csv-export'
import type { TimeEntryWithProject } from '@/types/app.types'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── Overview (charts) ───────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16',
]

function getColor(color: string | undefined, index: number): string {
  return color && color !== '' ? color : DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

type Period = 'today' | 'week' | 'month'

function SummaryCards({ totalMinutes, totalAmount, entryCount, loading }: {
  totalMinutes: number; totalAmount: number; entryCount: number; loading: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-8 w-24" /> : <p className="font-serif text-2xl font-bold">{formatDuration(totalMinutes)}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-8 w-24" /> : <p className="font-serif text-2xl font-bold">{formatCurrency(totalAmount)}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-8 w-24" /> : <p className="font-serif text-2xl font-bold">{entryCount}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function NoData() {
  return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data for this period</div>
}

function ProjectChart({ data, loading }: { data: { name: string; minutes: number; color: string; amount: number }[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-[300px] w-full" />
  if (data.length === 0) return <NoData />
  const chartData = data.map((d) => ({ name: d.name, hours: Math.round((d.minutes / 60) * 100) / 100, color: d.color }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" unit="h" />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 13 }} />
        <RechartsTooltip formatter={(value) => [`${Number(value)} h`, 'Hours']} />
        <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => <Cell key={entry.name} fill={getColor(entry.color, index)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ClientChart({ data, loading }: { data: { name: string; minutes: number; color: string; amount: number }[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-[300px] w-full" />
  if (data.length === 0) return <NoData />
  const chartData = data.map((d) => ({ name: d.name, hours: Math.round((d.minutes / 60) * 100) / 100, color: d.color }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={chartData} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={100}
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
          {chartData.map((entry, index) => <Cell key={entry.name} fill={getColor(entry.color, index)} />)}
        </Pie>
        <RechartsTooltip formatter={(value) => [`${Number(value)} h`, 'Hours']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function DailyTrendChart({ data, loading }: { data: { date: string; minutes: number }[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-[300px] w-full" />
  if (data.length === 0 || data.every((d) => d.minutes === 0)) return <NoData />
  const chartData = data.map((d) => ({ date: d.date, hours: Math.round((d.minutes / 60) * 100) / 100 }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis unit="h" />
        <RechartsTooltip formatter={(value) => [`${Number(value)} h`, 'Hours']} />
        <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function OverviewTab() {
  const [period, setPeriod] = useState<Period>('week')
  const { totalMinutes, totalAmount, entryCount, byProject, byClient, dailyData, loading } = useDashboardData(period)

  return (
    <div className="space-y-6">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-6 space-y-6">
          <SummaryCards totalMinutes={totalMinutes} totalAmount={totalAmount} entryCount={entryCount} loading={loading} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Time by Project</CardTitle></CardHeader>
              <CardContent><ProjectChart data={byProject} loading={loading} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Time by Client</CardTitle></CardHeader>
              <CardContent><ClientChart data={byClient} loading={loading} /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Daily Trend</CardTitle></CardHeader>
            <CardContent><DailyTrendChart data={dailyData} loading={loading} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Time Log ─────────────────────────────────────────────────────────────────

function TimeLogTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [projectFilter, setProjectFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { settings } = useSettings()
  const defaultRate = settings?.default_hourly_rate ? Number(settings.default_hourly_rate) : 0

  const { entries, loading } = useTimeEntries({
    startDate: format(monthStart, 'yyyy-MM-dd'),
    endDate: format(monthEnd, 'yyyy-MM-dd'),
    projectId: projectFilter || undefined,
  })

  const filteredEntries = useMemo(() => {
    if (!clientFilter) return entries
    return entries.filter((e) => e.project?.client?.id === clientFilter)
  }, [entries, clientFilter])

  const sortedEntries = useMemo(
    () => [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date)),
    [filteredEntries]
  )

  function getRate(entry: TimeEntryWithProject): number {
    return entry.project?.hourly_rate ? Number(entry.project.hourly_rate) : defaultRate
  }

  function getAmount(entry: TimeEntryWithProject): number {
    return (entry.duration_minutes / 60) * getRate(entry)
  }

  const totalMinutes = sortedEntries.reduce((s, e) => s + e.duration_minutes, 0)
  const totalAmount = sortedEntries.reduce((s, e) => s + getAmount(e), 0)

  function handleExportCSV() {
    const filename = `time-report-${format(currentMonth, 'yyyy-MM')}.csv`
    exportToCSV(sortedEntries, filename)
    toast.success('CSV exported')
  }

  async function handleExportPDF() {
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { MonthlyReportPDF } = await import('@/lib/pdf-report')
      const blob = await pdf(
        <MonthlyReportPDF
          entries={sortedEntries}
          title="Time Report"
          dateRange={`${formatDate(monthStart)} - ${formatDate(monthEnd)}`}
          defaultHourlyRate={defaultRate}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `time-report-${format(currentMonth, 'yyyy-MM')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF exported')
    } catch {
      toast.error('Failed to generate PDF')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[160px] text-center font-medium">{formatMonthYear(currentMonth)}</div>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-[200px]">
            <ProjectSelect value={projectFilter} onValueChange={setProjectFilter} placeholder="All projects" />
          </div>
          <div className="w-[200px]">
            <ClientSelect value={clientFilter} onValueChange={setClientFilter} placeholder="All clients" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={sortedEntries.length === 0}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={sortedEntries.length === 0}>
            <FileText className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-bold">{formatDuration(totalMinutes)}</div>
            <p className="text-xs text-muted-foreground">{formatDecimalHours(totalMinutes)} decimal hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-bold">{sortedEntries.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedEntries.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No entries for {formatMonthYear(currentMonth)}.
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>
                    {entry.project ? (
                      <Badge variant="secondary" style={{ backgroundColor: entry.project.color + '20', color: entry.project.color }}>
                        {entry.project.name}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{entry.project?.client?.name ?? '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                  <TableCell className="text-right font-mono">{formatDecimalHours(entry.duration_minutes)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(getRate(entry))}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(getAmount(entry))}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2">
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right font-mono">{formatDecimalHours(totalMinutes)}</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="space-y-6 px-8 py-8">
      <h1 className="font-serif text-2xl font-medium tracking-tight">Reports</h1>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="time-log">Time Log</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="time-log" className="mt-6">
          <TimeLogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
