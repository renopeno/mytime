import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { DurationInput } from './DurationInput'
import { ProjectSelect } from '@/components/projects/ProjectSelect'
import { cn } from '@/lib/utils'
import type { TimeEntryWithProject } from '@/types/app.types'

const timeEntrySchema = z.object({
  date: z.date(),
  project_id: z.string().nullable(),
  description: z.string(),
  duration_minutes: z.number().min(1, 'Duration is required'),
})

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>

interface TimeEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: TimeEntryWithProject | null
  onSubmit: (values: {
    date: string
    project_id: string | null
    description: string
    duration_minutes: number
  }) => Promise<{ error?: unknown }>
}

export function TimeEntryForm({
  open,
  onOpenChange,
  entry,
  onSubmit,
}: TimeEntryFormProps) {
  const isEditing = !!entry
  const [dateOpen, setDateOpen] = useState(false)

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date(),
      project_id: null,
      description: '',
      duration_minutes: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (entry) {
        form.reset({
          date: new Date(entry.date + 'T00:00:00'),
          project_id: entry.project_id,
          description: entry.description,
          duration_minutes: entry.duration_minutes,
        })
      } else {
        form.reset({
          date: new Date(),
          project_id: null,
          description: '',
          duration_minutes: 0,
        })
      }
    }
  }, [open, entry, form])

  async function handleSubmit(values: TimeEntryFormValues) {
    const result = await onSubmit({
      date: format(values.date, 'yyyy-MM-dd'),
      project_id: values.project_id,
      description: values.description,
      duration_minutes: values.duration_minutes,
    })
    if (result.error) {
      toast.error('Failed to save time entry')
      return
    }
    toast.success(isEditing ? 'Entry updated' : 'Entry created')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        />
                      }
                    >
                      {field.value ? format(field.value, 'dd.MM.yyyy') : 'Pick a date'}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date)
                          setDateOpen(false)
                        }}
                        weekStartsOn={1}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <FormControl>
                    <ProjectSelect
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
                      placeholder="What did you work on?"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <DurationInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update' : 'Add Entry'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
