import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { ClientSelect } from '@/components/clients/ClientSelect'
import { useProjects } from '@/hooks/useProjects'
import { PROJECT_TYPES, getProjectTypeLabel } from '@/types/app.types'
import type { ProjectWithClient } from '@/types/app.types'

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().min(1, 'Client is required'),
  description: z.string(),
  type: z.string().min(1, 'Type is required'),
  hourly_rate: z.number().nullable(),
  estimated_hours: z.number().nullable(),
  is_archived: z.boolean(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectWithClient | null
  onSuccess: () => void
}

export function ProjectForm({ open, onOpenChange, project, onSuccess }: ProjectFormProps) {
  const isEditing = !!project
  const { createProject, updateProject } = useProjects()

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      client_id: '',
      description: '',
      type: 'web_design',
      hourly_rate: null,
      estimated_hours: null,
      is_archived: false,
    },
  })

  useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name,
          client_id: project.client_id ?? '',
          description: project.description ?? '',
          type: project.type ?? 'web_design',
          hourly_rate: project.hourly_rate,
          estimated_hours: project.estimated_hours,
          is_archived: project.is_archived,
        })
      } else {
        form.reset({
          name: '',
          client_id: '',
          description: '',
          type: 'web_design',
          hourly_rate: null,
          estimated_hours: null,
          is_archived: false,
        })
      }
    }
  }, [open, project, form])

  async function handleSubmit(values: ProjectFormValues) {
    if (isEditing && project) {
      const { error } = await updateProject(project.id, {
        name: values.name,
        client_id: values.client_id,
        description: values.description,
        type: values.type,
        hourly_rate: values.hourly_rate,
        estimated_hours: values.estimated_hours,
        is_archived: values.is_archived,
      })
      if (error) {
        toast.error('Failed to update project')
        return
      }
      toast.success('Project updated')
    } else {
      const { error } = await createProject({
        name: values.name,
        client_id: values.client_id,
        description: values.description,
        type: values.type,
        hourly_rate: values.hourly_rate,
        estimated_hours: values.estimated_hours,
      })
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
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <span className="flex flex-1 text-left text-sm">{getProjectTypeLabel(field.value)}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_TYPES.map((pt) => (
                              <SelectItem key={pt.value} value={pt.value}>
                                {pt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <FormDescription>Uses client or default rate</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="No estimate"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? null : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="is_archived"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label className="!mt-0 cursor-pointer" onClick={() => field.onChange(!field.value)}>
                      Archived
                    </Label>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
