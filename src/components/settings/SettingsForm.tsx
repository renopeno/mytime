import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CountrySelect } from '@/components/ui/country-select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'

const settingsSchema = z.object({
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_city: z.string().optional(),
  company_zip: z.string().optional(),
  company_country: z.string().optional(),
  company_vat_id: z.string().optional(),
  default_hourly_rate: z
    .number({ error: 'Please enter a valid number' })
    .min(0, 'Hourly rate must be 0 or greater'),
  daily_hours_target: z
    .number({ error: 'Please enter a valid number' })
    .int('Must be a whole number')
    .min(1, 'Must be at least 1 hour')
    .max(24, 'Cannot exceed 24 hours'),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const { settings, loading, updateSettings } = useSettings()
  const [showInvoicing, setShowInvoicing] = useState(false)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      company_name: '',
      company_address: '',
      company_city: '',
      company_zip: '',
      company_country: '',
      company_vat_id: '',
      default_hourly_rate: 0,
      daily_hours_target: 8,
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        company_name: settings.company_name ?? '',
        company_address: settings.company_address ?? '',
        company_city: settings.company_city ?? '',
        company_zip: settings.company_zip ?? '',
        company_country: settings.company_country ?? '',
        company_vat_id: settings.company_vat_id ?? '',
        default_hourly_rate: settings.default_hourly_rate ?? 0,
        daily_hours_target: settings.daily_hours_target ?? 8,
      })
      if (settings.company_address || settings.company_city || settings.company_zip || settings.company_country || settings.company_vat_id) {
        setShowInvoicing(true)
      }
    }
  }, [settings, form])

  const onSubmit = async (values: SettingsFormValues) => {
    if (!showInvoicing) {
      values.company_address = ''
      values.company_city = ''
      values.company_zip = ''
      values.company_country = ''
      values.company_vat_id = ''
    }
    const result = await updateSettings(values)
    if (result?.error) {
      toast.error('Failed to save settings. Please try again.')
    } else {
      toast.success('Settings saved successfully.')
    }
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-0">
        <div className="flex h-10 items-center bg-neutral-20/50 px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">General</p>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground text-sm">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General */}
        <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-0">
          <div className="divide-y divide-neutral-30">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-6 px-6 py-4 space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Company name</p>
                    <p className="text-[13px] text-muted-foreground">Used on invoices and in the sidebar</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <FormControl>
                      <Input placeholder="Acme Inc." className="w-52" {...field} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <div className="flex items-center justify-between gap-6 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Generate invoices</p>
                <p className="text-[13px] text-muted-foreground">Set up your company details for invoicing</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showInvoicing}
                onClick={() => setShowInvoicing(!showInvoicing)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors',
                  showInvoicing ? 'bg-primary' : 'bg-neutral-40'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5',
                    showInvoicing ? 'translate-x-[18px]' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
            {showInvoicing && (
              <>
                <FormField
                  control={form.control}
                  name="company_address"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-6 px-6 py-4 space-y-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Address</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <FormControl>
                          <Input placeholder="123 Main St" className="w-52" {...field} />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between gap-6 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">City & postal code</p>
                  </div>
                  <div className="flex w-52 gap-2">
                    <FormField
                      control={form.control}
                      name="company_city"
                      render={({ field }) => (
                        <FormItem className="flex-1 space-y-0">
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company_zip"
                      render={({ field }) => (
                        <FormItem className="w-20 shrink-0 space-y-0">
                          <FormControl>
                            <Input placeholder="ZIP" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="company_country"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-6 px-6 py-4 space-y-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Country</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <FormControl>
                          <CountrySelect
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            className="w-52"
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_vat_id"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-6 px-6 py-4 space-y-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">VAT / Tax ID</p>
                        <p className="text-[13px] text-muted-foreground">Shown on invoices</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <FormControl>
                          <Input placeholder="e.g. HR12345678901" className="w-52" {...field} />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        </div>

        {/* Billing */}
        <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-0">
          <div className="flex h-10 items-center bg-neutral-20/50 px-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">Billing</p>
          </div>
          <div className="divide-y divide-neutral-30">
            <FormField
              control={form.control}
              name="default_hourly_rate"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-6 px-6 py-4 space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Default hourly rate</p>
                    <p className="text-[13px] text-muted-foreground">Fallback rate for projects and invoices</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-20"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? 0 : parseFloat(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="daily_hours_target"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-6 px-6 py-4 space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Daily hours target</p>
                    <p className="text-[13px] text-muted-foreground">Affects the daily progress indicator</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        max="24"
                        placeholder="8"
                        className="w-20"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? 8 : parseInt(e.target.value, 10)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </Form>
  )
}
