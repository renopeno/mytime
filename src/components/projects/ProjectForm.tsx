import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { ClientSelect } from '@/components/clients/ClientSelect'
import { ColorSwatchPicker } from '@/components/ui/color-swatch-picker'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import type { ProjectWithClient } from '@/types/app.types'

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().nullable(),
  description: z.string(),
  color: z.string(),
  hourly_rate: z.number().nullable(),
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
  const { clients } = useClients()

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      client_id: null,
      description: '',
      color: '#6366f1',
      hourly_rate: null,
      is_archived: false,
    },
  })

  const userOverrodeColor = useRef(false)
  const watchedClientId = useWatch({ control: form.control, name: 'client_id' })

  useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name,
          client_id: project.client_id,
          description: project.description ?? '',
          color: project.color,
          hourly_rate: project.hourly_rate,
          is_archived: project.is_archived,
        })
        // Edit mode: don't overwrite the project's existing color
        userOverrodeColor.current = true
      } else {
        form.reset({
          name: '',
          client_id: null,
          description: '',
          color: '#6366f1',
          hourly_rate: null,
          is_archived: false,
        })
        // New project: allow auto-set from client color
        userOverrodeColor.current = false
      }
    }
  }, [open, project, form])

  // Auto-inherit color from selected client (new projects only)
  useEffect(() => {
    if (userOverrodeColor.current) return
    if (watchedClientId) {
      const client = clients.find((c) => c.id === watchedClientId)
      if (client?.color) {
        form.setValue('color', client.color, { shouldDirty: false })
      }
    }
  }, [watchedClientId, clients, form])

  async function handleSubmit(values: ProjectFormValues) {
    if (isEditing && project) {
      const { error } = await updateProject(project.id, {
        name: values.name,
        client_id: values.client_id,
        description: values.description,
        color: values.color,
        hourly_rate: values.hourly_rate,
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
        color: values.color,
        hourly_rate: values.hourly_rate,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'Add Project'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Project description"
                      className="resize-none"
                      rows={3}
                      {...field}
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
                      onChange={(color) => {
                        userOverrodeColor.current = true
                        field.onChange(color)
                      }}
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
                    <FormDescription>Uses client or default rate</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

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
