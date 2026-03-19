import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/useSettings'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { ClientSelect } from '@/components/clients/ClientSelect'
import { ColorSwatchPicker } from '@/components/ui/color-swatch-picker'
// project type removed

// ─── Step 1: Workspace name ──────────────────────────────────────────────────

const workspaceSchema = z.object({
  company_name: z.string().min(1, 'Workspace name is required'),
})

function StepWorkspaceName({ onNext }: { onNext: () => void }) {
  const { settings, updateSettings } = useSettings()

  const form = useForm({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { company_name: '' },
  })

  useEffect(() => {
    if (settings?.company_name) {
      form.reset({ company_name: settings.company_name })
    }
  }, [settings, form])

  const onSubmit = async (values: { company_name: string }) => {
    await updateSettings({ company_name: values.company_name })
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." autoFocus {...field} />
              </FormControl>
              <FormDescription>
                Shown in the sidebar. You can change this anytime in Settings.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Continue
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// ─── Step 2: Hourly rate ──────────────────────────────────────────────────────

const rateSchema = z.object({
  default_hourly_rate: z.number({ error: 'Please enter a valid number' }).min(0),
})

function StepHourlyRate({ onNext }: { onNext: () => void }) {
  const { settings, updateSettings } = useSettings()

  const form = useForm({
    resolver: zodResolver(rateSchema),
    defaultValues: { default_hourly_rate: 0 },
  })

  useEffect(() => {
    if (settings) {
      form.reset({ default_hourly_rate: settings.default_hourly_rate ?? 0 })
    }
  }, [settings, form])

  const onSubmit = async (values: { default_hourly_rate: number }) => {
    await updateSettings({ default_hourly_rate: values.default_hourly_rate })
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))
                  }
                />
              </FormControl>
              <FormDescription>
                Used as the fallback rate for projects and invoices.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onNext}>
            Skip
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Continue
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// ─── Step 3: Daily hours target ──────────────────────────────────────────────

const dailyHoursSchema = z.object({
  daily_hours_target: z.number({ error: 'Please enter a valid number' }).int().min(1).max(24),
})

function StepDailyHours({ onNext }: { onNext: () => void }) {
  const { settings, updateSettings } = useSettings()

  const form = useForm({
    resolver: zodResolver(dailyHoursSchema),
    defaultValues: { daily_hours_target: 8 },
  })

  useEffect(() => {
    if (settings?.daily_hours_target) {
      form.reset({ daily_hours_target: settings.daily_hours_target })
    }
  }, [settings, form])

  const onSubmit = async (values: { daily_hours_target: number }) => {
    await updateSettings({ daily_hours_target: values.daily_hours_target })
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="daily_hours_target"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hours per day</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  max="24"
                  placeholder="8"
                  {...field}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? 8 : parseInt(e.target.value, 10))
                  }
                />
              </FormControl>
              <FormDescription>
                Used for the daily progress indicator on time entries.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onNext}>
            Skip
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Continue
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// ─── Step 4: First client ────────────────────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

interface StepAddClientProps {
  onNext: () => void
  onClientCreated: (clientId: string) => void
}

function StepAddClient({ onNext, onClientCreated }: StepAddClientProps) {
  const { createClient } = useClients()

  const form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '' },
  })

  const onSubmit = async (values: { name: string }) => {
    const { data, error } = await createClient(values)
    if (error || !data) {
      toast.error('Failed to create client')
      return
    }
    onClientCreated(data.id)
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onNext}>
            Skip
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Create Client
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// ─── Step 4: First project ───────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().nullable(),
  color: z.string(),
  hourly_rate: z.number().nullable(),
})

interface StepAddProjectProps {
  onComplete: () => void
  preselectedClientId: string | null
}

function StepAddProject({ onComplete, preselectedClientId }: StepAddProjectProps) {
  const { createProject } = useProjects()

  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      client_id: preselectedClientId,
      color: '#6366f1',
      hourly_rate: null as number | null,
    },
  })

  const onSubmit = async (values: { name: string; client_id: string | null; color: string; hourly_rate: number | null }) => {
    const { error } = await createProject(values)
    if (error) {
      toast.error('Failed to create project')
      return
    }
    onComplete()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Website redesign" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <FormControl>
                <ClientSelect
                  value={field.value ?? ''}
                  onValueChange={(val) => field.onChange(val || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <ColorSwatchPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hourly_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hourly Rate (EUR)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Uses default rate"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val === '' ? null : parseFloat(val))
                  }}
                />
              </FormControl>
              {!field.value && (
                <FormDescription>Leave empty to use client or default rate</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onComplete}>
            Skip
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Create Project
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

// ─── Wizard orchestration ────────────────────────────────────────────────────

const STEP_TITLES = {
  1: 'Name your workspace',
  2: 'Set your hourly rate',
  3: 'Set your daily hours',
  4: 'Add your first client',
  5: 'Create your first project',
} as const

const STEP_DESCRIPTIONS = {
  1: 'This will be shown in the sidebar.',
  2: 'You can change this anytime in Settings.',
  3: 'How many hours do you typically work per day?',
  4: 'Clients help you organize projects and invoices.',
  5: 'Projects let you track time for specific work.',
} as const

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)

  const handleClientCreated = (id: string) => {
    setCreatedClientId(id)
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          {/* Step indicator */}
          <div className="flex gap-1.5 pb-1">
            {([1, 2, 3, 4, 5] as const).map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  s <= step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
          <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>

        {step === 1 && <StepWorkspaceName onNext={() => setStep(2)} />}
        {step === 2 && <StepHourlyRate onNext={() => setStep(3)} />}
        {step === 3 && <StepDailyHours onNext={() => setStep(4)} />}
        {step === 4 && (
          <StepAddClient
            onNext={() => setStep(5)}
            onClientCreated={handleClientCreated}
          />
        )}
        {step === 5 && (
          <StepAddProject
            onComplete={onComplete}
            preselectedClientId={createdClientId}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
