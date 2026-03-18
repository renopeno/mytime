import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatDecimalHours } from '@/lib/duration'
import { formatCurrency } from '@/lib/format'
import { format } from 'date-fns'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  filtersLine: {
    fontSize: 9,
    color: '#888',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  summarySmall: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  // Summary table columns
  colSummaryName: { width: '50%' },
  colSummaryHours: { width: '25%', textAlign: 'right' },
  colSummaryAmount: { width: '25%', textAlign: 'right' },
  // Detail table columns
  colDate: { width: '10%' },
  colProject: { width: '14%' },
  colClient: { width: '12%' },
  colDescription: { width: '32%' },
  colDuration: { width: '10%', textAlign: 'right' },
  colRate: { width: '10%', textAlign: 'right' },
  colAmount: { width: '12%', textAlign: 'right' },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 6,
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#999',
  },
})

export interface ReportPDFProps {
  dateRange: { from: Date; to: Date }
  filters: {
    projects?: string[]
    clients?: string[]
    billingStatus?: string
  }
  summary: {
    totalMinutes: number
    totalAmount: number
    workingDays: number
    totalWorkingDays: number
    billingBreakdown: { notPaid: number; invoiceSent: number; paid: number }
  }
  byProject: Array<{ name: string; minutes: number; amount: number }>
  byClient: Array<{ name: string; minutes: number; amount: number }>
  entries: Array<{
    date: string
    projectName?: string
    clientName?: string
    description: string
    durationMinutes: number
    rate: number
    amount: number
  }>
}

function formatDateRange(from: Date, to: Date): string {
  return `${format(from, 'MMMM d')} \u2013 ${format(to, 'MMMM d, yyyy')}`
}

function buildFiltersLine(filters: ReportPDFProps['filters']): string | null {
  const parts: string[] = []
  if (filters.projects && filters.projects.length > 0) {
    parts.push(filters.projects.join(', '))
  }
  if (filters.clients && filters.clients.length > 0) {
    parts.push(filters.clients.join(', '))
  }
  if (filters.billingStatus && filters.billingStatus !== 'all') {
    const labels: Record<string, string> = {
      not_paid: 'Not Paid',
      invoice_sent: 'Invoice Sent',
      paid: 'Paid',
    }
    parts.push(labels[filters.billingStatus] ?? filters.billingStatus)
  }
  return parts.length > 0 ? `Filters: ${parts.join(' \u2022 ')}` : null
}

export function ReportPDF({ dateRange, filters, summary, byProject, byClient, entries }: ReportPDFProps) {
  const filtersLine = buildFiltersLine(filters)
  const { totalMinutes, totalAmount, workingDays, totalWorkingDays, billingBreakdown } = summary
  const activeRatio = totalWorkingDays > 0 ? Math.round((workingDays / totalWorkingDays) * 100) : 0
  const generatedDate = format(new Date(), 'dd.MM.yyyy')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Report</Text>
          <Text style={styles.subtitle}>{formatDateRange(dateRange.from, dateRange.to)}</Text>
          {filtersLine && <Text style={styles.filtersLine}>{filtersLine}</Text>}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Hours</Text>
            <Text style={styles.summaryValue}>{formatDecimalHours(totalMinutes)}h</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Days Active</Text>
            <Text style={styles.summaryValue}>{activeRatio}%</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Billing</Text>
            <Text style={styles.summarySmall}>Paid: {formatCurrency(billingBreakdown.paid)}</Text>
            <Text style={styles.summarySmall}>Invoiced: {formatCurrency(billingBreakdown.invoiceSent)}</Text>
            <Text style={styles.summarySmall}>Not Paid: {formatCurrency(billingBreakdown.notPaid)}</Text>
          </View>
        </View>

        {/* By Project */}
        {byProject.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>By Project</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, styles.colSummaryName]}>Project</Text>
              <Text style={[styles.headerText, styles.colSummaryHours]}>Hours</Text>
              <Text style={[styles.headerText, styles.colSummaryAmount]}>Amount</Text>
            </View>
            {byProject.map((row) => (
              <View style={styles.tableRow} key={row.name}>
                <Text style={styles.colSummaryName}>{row.name}</Text>
                <Text style={styles.colSummaryHours}>{formatDecimalHours(row.minutes)}</Text>
                <Text style={styles.colSummaryAmount}>{formatCurrency(row.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* By Client */}
        {byClient.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>By Client</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, styles.colSummaryName]}>Client</Text>
              <Text style={[styles.headerText, styles.colSummaryHours]}>Hours</Text>
              <Text style={[styles.headerText, styles.colSummaryAmount]}>Amount</Text>
            </View>
            {byClient.map((row) => (
              <View style={styles.tableRow} key={row.name}>
                <Text style={styles.colSummaryName}>{row.name}</Text>
                <Text style={styles.colSummaryHours}>{formatDecimalHours(row.minutes)}</Text>
                <Text style={styles.colSummaryAmount}>{formatCurrency(row.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Detailed Entries */}
        <Text style={styles.sectionTitle}>Detailed Entries</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={[styles.headerText, styles.colProject]}>Project</Text>
          <Text style={[styles.headerText, styles.colClient]}>Client</Text>
          <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
          <Text style={[styles.headerText, styles.colDuration]}>Hours</Text>
          <Text style={[styles.headerText, styles.colRate]}>Rate</Text>
          <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
        </View>

        {entries.map((entry, i) => (
          <View style={styles.tableRow} key={`${entry.date}-${i}`}>
            <Text style={styles.colDate}>{entry.date}</Text>
            <Text style={styles.colProject}>{entry.projectName ?? '-'}</Text>
            <Text style={styles.colClient}>{entry.clientName ?? '-'}</Text>
            <Text style={styles.colDescription}>{entry.description || '-'}</Text>
            <Text style={styles.colDuration}>{formatDecimalHours(entry.durationMinutes)}</Text>
            <Text style={styles.colRate}>{formatCurrency(entry.rate)}</Text>
            <Text style={styles.colAmount}>{formatCurrency(entry.amount)}</Text>
          </View>
        ))}

        {/* Total row */}
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, styles.colDate]}></Text>
          <Text style={[styles.totalLabel, styles.colProject]}></Text>
          <Text style={[styles.totalLabel, styles.colClient]}></Text>
          <Text style={[styles.totalLabel, styles.colDescription]}>Total</Text>
          <Text style={[styles.totalValue, styles.colDuration]}>{formatDecimalHours(totalMinutes)}</Text>
          <Text style={[styles.totalValue, styles.colRate]}></Text>
          <Text style={[styles.totalValue, styles.colAmount]}>{formatCurrency(totalAmount)}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {generatedDate}</Text>
          <Text>MyTimeTracker</Text>
        </View>
      </Page>
    </Document>
  )
}
