import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Upload, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/useSettings'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
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
import { ClientSelect } from '@/components/clients/ClientSelect'
import { ColorSwatchPicker } from '@/components/ui/color-swatch-picker'
import { CountrySelect } from '@/components/ui/country-select'
import { ImportWizard } from '@/components/import/ImportWizard'
import type { WizardStep } from '@/components/import/ImportWizard'
import { Badge } from '@/components/ui/badge'

// ─── Shared stepper ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 pt-3">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={cn(
            'h-0.5 flex-1 rounded-full transition-colors',
            s <= current ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </div>
  )
}

// ─── Step 1: Workspace setup ─────────────────────────────────────────────────

const workspaceSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_address: z.string(),
  company_city: z.string(),
  company_zip: z.string(),
  company_country: z.string(),
  company_vat_id: z.string(),
  default_hourly_rate: z.number({ error: 'Please enter a valid number' }).min(0),
  daily_hours_target: z.number({ error: 'Please enter a valid number' }).int().min(1).max(24),
})

function StepWorkspaceSetup({ onNext }: { onNext: () => void }) {
  const { settings, updateSettings } = useSettings()
  const [showInvoicing, setShowInvoicing] = useState(() => {
    if (!settings) return false
    return !!(settings.company_address || settings.company_city || settings.company_zip || settings.company_country || settings.company_vat_id)
  })

  const form = useForm({
    resolver: zodResolver(workspaceSchema),
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

  const onSubmit = async (values: z.infer<typeof workspaceSchema>) => {
    if (!showInvoicing) {
      values.company_address = ''
      values.company_city = ''
      values.company_zip = ''
      values.company_country = ''
      values.company_vat_id = ''
    }
    await updateSettings(values)
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Company name + invoicing toggle */}
        <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10">
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
                      <Input placeholder="Acme Inc." className="w-52" autoFocus {...field} />
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
                            value={field.value}
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

        {/* Billing & schedule */}
        <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10">
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
                          field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))
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
                          field.onChange(e.target.value === '' ? 8 : parseInt(e.target.value, 10))
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

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Continue
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ─── Step 2: Choose path (manual vs import) ──────────────────────────────────

const TOOL_INSTRUCTIONS = [
  {
    name: 'Toggl Track',
    steps: 'Reports → Detailed → Export → Download as CSV',
  },
  {
    name: 'Clockify',
    steps: 'Reports → Detailed → Export → CSV',
  },
  {
    name: 'Harvest',
    steps: 'Reports → Detailed → Export CSV',
  },
]

interface StepChoosePathProps {
  onManual: () => void
  onImport: () => void
  onBack: () => void
}

function StepChoosePath({ onManual, onImport, onBack }: StepChoosePathProps) {
  const [showInstructions, setShowInstructions] = useState(false)

  return (
    <div className="space-y-4">
      {/* Manual option */}
      <button
        type="button"
        onClick={onManual}
        className="w-full text-left overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10 p-6 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-20">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Start fresh</p>
            <p className="text-[13px] text-muted-foreground mt-0.5">Add your first client and project manually</p>
          </div>
        </div>
      </button>

      {/* Import option */}
      <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors">
        <button
          type="button"
          onClick={onImport}
          className="w-full text-left p-6 cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-20">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Import from a tool</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Bring your existing data from another time tracker
              </p>
              <div className="flex gap-1.5 mt-2">
                <Badge variant="secondary">Toggl</Badge>
                <Badge variant="secondary">Clockify</Badge>
                <Badge variant="secondary">Harvest</Badge>
                <Badge variant="secondary">CSV</Badge>
              </div>
            </div>
          </div>
        </button>

        {/* Export instructions toggle */}
        <div className="border-t border-neutral-30 px-6 py-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowInstructions(!showInstructions)
            }}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showInstructions && 'rotate-180')} />
            How to export from your tool
          </button>
          {showInstructions && (
            <div className="mt-3 space-y-2">
              {TOOL_INSTRUCTIONS.map((tool) => (
                <div key={tool.name} className="flex items-baseline gap-2 text-[13px]">
                  <span className="font-medium shrink-0">{tool.name}:</span>
                  <span className="text-muted-foreground">{tool.steps}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-start pt-2">
        <Button variant="ghost" type="button" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3a: Add first client (manual path) ────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

interface StepAddClientProps {
  onNext: () => void
  onBack: () => void
  onClientCreated: (clientId: string) => void
}

function StepAddClient({ onNext, onBack, onClientCreated }: StepAddClientProps) {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10">
          <div className="flex h-10 items-center bg-neutral-20/50 px-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">Client</p>
          </div>
          <div className="space-y-6 p-6">
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
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" type="button" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onNext}>
              Skip
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Create Client
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

// ─── Step 3b: Add first project (manual path) ───────────────────────────────

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().nullable(),
  color: z.string(),
  hourly_rate: z.number().nullable(),
})

interface StepAddProjectProps {
  onComplete: () => void
  onBack: () => void
  preselectedClientId: string | null
}

function StepAddProject({ onComplete, onBack, preselectedClientId }: StepAddProjectProps) {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General */}
        <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10">
          <div className="flex h-10 items-center bg-neutral-20/50 px-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">General</p>
          </div>
          <div className="space-y-6 p-6">
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
          </div>
        </div>

        {/* Billing */}
        <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10">
          <div className="flex h-10 items-center bg-neutral-20/50 px-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">Billing</p>
          </div>
          <div className="space-y-6 p-6">
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
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" type="button" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onComplete}>
              Skip
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Create Project
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

// ─── Import step title mapping ───────────────────────────────────────────────

const IMPORT_STEP_TITLES: Record<WizardStep, string> = {
  upload: 'Upload your CSV',
  preview: 'Preview your data',
  mapping: 'Map clients & projects',
  import: 'Import your data',
}

// ─── Wizard orchestration ────────────────────────────────────────────────────

type OnboardingStep = 'setup' | 'choose' | 'client' | 'project' | 'import'

const STEP_TITLES: Partial<Record<OnboardingStep, string>> = {
  setup: 'Set up your workspace',
  choose: 'Add your data',
  client: 'Add your first client',
  project: 'Create your first project',
}

function getStepNumber(step: OnboardingStep, mode: 'undecided' | 'manual' | 'import'): number {
  if (step === 'setup') return 1
  if (step === 'choose') return 2
  if (mode === 'manual') {
    if (step === 'client') return 3
    if (step === 'project') return 4
  }
  // import mode: step 2 is choose, step 3 is import (all sub-steps)
  if (step === 'import') return 3
  return 2
}

function getTotalSteps(mode: 'undecided' | 'manual' | 'import'): number {
  if (mode === 'manual') return 4
  if (mode === 'import') return 3
  return 3 // undecided — show 3 as default
}

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>('setup')
  const [mode, setMode] = useState<'undecided' | 'manual' | 'import'>('undecided')
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [importStep, setImportStep] = useState<WizardStep>('upload')

  const title = step === 'import'
    ? IMPORT_STEP_TITLES[importStep]
    : STEP_TITLES[step] ?? ''

  const currentStepNumber = getStepNumber(step, mode)
  const totalSteps = getTotalSteps(mode)

  return (
    <div className="flex h-svh flex-col bg-sidebar">
      {/* Centered content container */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-12 md:py-20">
        <div className="w-full max-w-[672px]">
          {/* Header */}
          <div className="flex flex-col gap-2 pb-6">
            <h1 className="font-serif text-[28px] leading-8 font-normal">{title}</h1>
            <StepIndicator current={currentStepNumber} total={totalSteps} />
          </div>

          {/* Content */}
          {step === 'setup' && (
            <StepWorkspaceSetup onNext={() => setStep('choose')} />
          )}
          {step === 'choose' && (
            <StepChoosePath
              onManual={() => {
                setMode('manual')
                setStep('client')
              }}
              onImport={() => {
                setMode('import')
                setStep('import')
              }}
              onBack={() => setStep('setup')}
            />
          )}
          {step === 'client' && (
            <StepAddClient
              onNext={() => setStep('project')}
              onBack={() => setStep('choose')}
              onClientCreated={(id) => setCreatedClientId(id)}
            />
          )}
          {step === 'project' && (
            <StepAddProject
              onComplete={onComplete}
              onBack={() => setStep('client')}
              preselectedClientId={createdClientId}
            />
          )}
          {step === 'import' && (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10">
                <ImportWizard
                  hideHeader
                  onStepChange={setImportStep}
                  onComplete={onComplete}
                  onCancel={() => {
                    setMode('undecided')
                    setStep('choose')
                  }}
                />
              </div>
              {importStep === 'upload' && (
                <div className="flex justify-start">
                  <Button variant="ghost" type="button" size="sm" onClick={() => {
                    setMode('undecided')
                    setStep('choose')
                  }}>
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
