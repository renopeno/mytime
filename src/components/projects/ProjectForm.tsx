import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { ClientSelect } from '@/components/clients/ClientSelect'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { formatCurrency } from '@/lib/format'
import type { ProjectWithClient } from '@/types/app.types'

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().min(1, 'Client is required'),
  description: z.string(),
  // Rate
  rate_mode: z.enum(['default', 'custom']),
  hourly_rate: z.number().nullable(),
  // Estimation
  estimation_type: z.enum(['none', 'hours', 'amount']),
  estimated_hours: z.number().nullable(),
  estimated_amount: z.number().nullable(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectWithClient | null
  onSuccess: () => void
  onDelete?: (id: string) => void
  defaultRate: number
}

export function ProjectForm({ open, onOpenChange, project, onSuccess, onDelete, defaultRate }: ProjectFormProps) {
  const isEditing = !!project
  const { createProject, updateProject } = useProjects()
  const { clients } = useClients()
  const customRateRef = useRef<HTMLInputElement>(null)
  const hoursRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      client_id: '',
      description: '',
      rate_mode: 'default',
      hourly_rate: null,
      estimation_type: 'none',
      estimated_hours: null,
      estimated_amount: null,
    },
  })

  const watchedClientId = form.watch('client_id')
  const rateMode = form.watch('rate_mode')
  const estimationType = form.watch('estimation_type')
  const selectedClient = clients.find((c) => c.id === watchedClientId) ?? null
  const effectiveRate = selectedClient?.hourly_rate ?? defaultRate

  useEffect(() => {
    if (open) {
      if (project) {
        const estType = project.estimation_type === 'amount' ? 'amount' as const
          : project.estimated_hours != null ? 'hours' as const
          : 'none' as const
        form.reset({
          name: project.name,
          client_id: project.client_id ?? '',
          description: project.description ?? '',
          rate_mode: project.hourly_rate != null ? 'custom' : 'default',
          hourly_rate: project.hourly_rate,
          estimation_type: estType,
          estimated_hours: project.estimated_hours,
          estimated_amount: project.estimated_amount ?? null,
        })
      } else {
        form.reset({
          name: '',
          client_id: '',
          description: '',
          rate_mode: 'default',
          hourly_rate: null,
          estimation_type: 'none',
          estimated_hours: null,
          estimated_amount: null,
        })
      }
    }
  }, [open, project, form])

  async function handleSubmit(values: ProjectFormValues) {
    const payload = {
      name: values.name,
      client_id: values.client_id,
      description: values.description,
      hourly_rate: values.rate_mode === 'custom' ? values.hourly_rate : null,
      estimated_hours: values.estimation_type === 'hours' ? values.estimated_hours : null,
      estimated_amount: values.estimation_type === 'amount' ? values.estimated_amount : null,
      estimation_type: values.estimation_type === 'none' ? null : values.estimation_type,
    }

    if (isEditing && project) {
      const { error } = await updateProject(project.id, payload)
      if (error) {
        toast.error('Failed to update project')
        return
      }
      toast.success('Project updated')
    } else {
      const { error } = await createProject(payload)
      if (error) {
        toast.error('Failed to create project')
        return
      }
      toast.success('Project created')
    }
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'Add Project'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Project name" {...field} />
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
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Billing & budget */}
            <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-10">
              <div className="flex h-10 items-center bg-neutral-20/50 px-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">Billing &amp; Budget</p>
              </div>
              <div className="space-y-6 p-6">
                {/* Hourly Rate */}
                <FormField
                  control={form.control}
                  name="rate_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate</FormLabel>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rate_mode"
                            checked={field.value === 'default'}
                            onChange={() => {
                              field.onChange('default')
                              form.setValue('hourly_rate', null)
                            }}
                            className="accent-primary"
                          />
                          <span className="text-sm">
                            Default ({formatCurrency(effectiveRate)}/hr)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rate_mode"
                            checked={field.value === 'custom'}
                            onChange={() => {
                              field.onChange('custom')
                              setTimeout(() => customRateRef.current?.focus(), 0)
                            }}
                            className="accent-primary"
                          />
                          <span className="text-sm">Custom</span>
                          {field.value === 'custom' && (
                            <Input
                              ref={customRateRef}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="ml-1 h-8 w-28"
                              value={form.watch('hourly_rate') ?? ''}
                              onChange={(e) => {
                                const val = e.target.value
                                form.setValue('hourly_rate', val === '' ? null : parseFloat(val))
                              }}
                            />
                          )}
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Estimation */}
                <FormField
                  control={form.control}
                  name="estimation_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimation</FormLabel>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="estimation_type"
                            checked={field.value === 'none'}
                            onChange={() => field.onChange('none')}
                            className="accent-primary"
                          />
                          <span className="text-sm">No estimate</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="estimation_type"
                            checked={field.value === 'hours'}
                            onChange={() => {
                              field.onChange('hours')
                              setTimeout(() => hoursRef.current?.focus(), 0)
                            }}
                            className="accent-primary"
                          />
                          <span className="text-sm">By hours</span>
                          {field.value === 'hours' && (
                            <Input
                              ref={hoursRef}
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="0"
                              className="ml-1 h-8 w-28"
                              value={form.watch('estimated_hours') ?? ''}
                              onChange={(e) => {
                                const val = e.target.value
                                form.setValue('estimated_hours', val === '' ? null : parseFloat(val))
                              }}
                            />
                          )}
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="estimation_type"
                            checked={field.value === 'amount'}
                            onChange={() => {
                              field.onChange('amount')
                              setTimeout(() => amountRef.current?.focus(), 0)
                            }}
                            className="accent-primary"
                          />
                          <span className="text-sm">By amount (€)</span>
                          {field.value === 'amount' && (
                            <Input
                              ref={amountRef}
                              type="number"
                              step="1"
                              min="0"
                              placeholder="0"
                              className="ml-1 h-8 w-28"
                              value={form.watch('estimated_amount') ?? ''}
                              onChange={(e) => {
                                const val = e.target.value
                                form.setValue('estimated_amount', val === '' ? null : parseFloat(val))
                              }}
                            />
                          )}
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="-mx-8 -mb-8 flex items-center rounded-b-[14px] border-t border-neutral-30 bg-neutral-20 px-6 py-4">
              {/* Left: delete (edit mode only) */}
              <div className="flex-1">
                {isEditing && onDelete && project && (
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    } />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{project.name}&quot;. Time entries linked to this project will not be deleted but will no longer have a project assigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                          onDelete(project.id)
                          onOpenChange(false)
                        }}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {/* Right: cancel + save */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Update' : 'Create Project'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
