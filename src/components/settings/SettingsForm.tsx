import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const settingsSchema = z.object({
  company_name: z.string().optional(),
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

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      company_name: '',
      default_hourly_rate: 0,
      daily_hours_target: 8,
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        company_name: settings.company_name ?? '',
        default_hourly_rate: settings.default_hourly_rate ?? 0,
        daily_hours_target: settings.daily_hours_target ?? 8,
      })
    }
  }, [settings, form])

  const onSubmit = async (values: SettingsFormValues) => {
    const result = await updateSettings(values)
    if (result?.error) {
      toast.error('Failed to save settings. Please try again.')
    } else {
      toast.success('Settings saved successfully.')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Preferences</CardTitle>
        <CardDescription>
          Configure your default settings for time tracking and invoicing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...field} />
                  </FormControl>
                  <FormDescription>
                    Shown in the sidebar header.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_hourly_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Hourly Rate (EUR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? 0 : parseFloat(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    This rate will be used as the default when creating new
                    projects or invoices.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="daily_hours_target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Hours Target</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max="24"
                      placeholder="8"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? 8 : parseInt(e.target.value, 10)
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Number of working hours in a typical day. Affects the daily progress indicator.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
