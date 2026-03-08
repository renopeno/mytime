import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatDecimalHours } from '@/lib/duration'
import { formatDate, formatCurrency } from '@/lib/format'
import type { TimeEntryWithProject } from '@/types/app.types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
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
  colDate: { width: '12%' },
  colProject: { width: '18%' },
  colClient: { width: '15%' },
  colDescription: { width: '30%' },
  colDuration: { width: '10%', textAlign: 'right' },
  colRate: { width: '7%', textAlign: 'right' },
  colAmount: { width: '8%', textAlign: 'right' },
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

interface MonthlyReportPDFProps {
  entries: TimeEntryWithProject[]
  title: string
  dateRange: string
  defaultHourlyRate: number
}

export function MonthlyReportPDF({ entries, title, dateRange, defaultHourlyRate }: MonthlyReportPDFProps) {
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0)

  function getRate(entry: TimeEntryWithProject): number {
    return entry.project?.hourly_rate ? Number(entry.project.hourly_rate) : defaultHourlyRate
  }

  function getAmount(entry: TimeEntryWithProject): number {
    return (entry.duration_minutes / 60) * getRate(entry)
  }

  const totalAmount = entries.reduce((sum, e) => sum + getAmount(e), 0)
  const generatedDate = formatDate(new Date())

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{dateRange}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Hours</Text>
            <Text style={styles.summaryValue}>{formatDecimalHours(totalMinutes)}h</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Entries</Text>
            <Text style={styles.summaryValue}>{entries.length}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={[styles.headerText, styles.colProject]}>Project</Text>
          <Text style={[styles.headerText, styles.colClient]}>Client</Text>
          <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
          <Text style={[styles.headerText, styles.colDuration]}>Hours</Text>
          <Text style={[styles.headerText, styles.colRate]}>Rate</Text>
          <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
        </View>

        {entries.map((entry) => (
          <View style={styles.tableRow} key={entry.id}>
            <Text style={styles.colDate}>{formatDate(entry.date)}</Text>
            <Text style={styles.colProject}>{entry.project?.name ?? '-'}</Text>
            <Text style={styles.colClient}>{entry.project?.client?.name ?? '-'}</Text>
            <Text style={styles.colDescription}>{entry.description || '-'}</Text>
            <Text style={styles.colDuration}>{formatDecimalHours(entry.duration_minutes)}</Text>
            <Text style={styles.colRate}>{formatCurrency(getRate(entry))}</Text>
            <Text style={styles.colAmount}>{formatCurrency(getAmount(entry))}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, styles.colDate]}></Text>
          <Text style={[styles.totalLabel, styles.colProject]}></Text>
          <Text style={[styles.totalLabel, styles.colClient]}></Text>
          <Text style={[styles.totalLabel, styles.colDescription]}>Total</Text>
          <Text style={[styles.totalValue, styles.colDuration]}>{formatDecimalHours(totalMinutes)}</Text>
          <Text style={[styles.totalValue, styles.colRate]}></Text>
          <Text style={[styles.totalValue, styles.colAmount]}>{formatCurrency(totalAmount)}</Text>
        </View>

        <View style={styles.footer}>
          <Text>Generated: {generatedDate}</Text>
          <Text>MyTimeTracker</Text>
        </View>
      </Page>
    </Document>
  )
}
