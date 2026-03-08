import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ProjectCombobox } from './ProjectCombobox'
import { DateDurationInput } from './DateDurationInput'

interface QuickEntryFormProps {
  onSubmit: (values: {
    date: string
    project_id: string | null
    description: string
    duration_minutes: number
  }) => Promise<{ error?: unknown }>
  date: string
  onDateChange: (date: string) => void
}

export function QuickEntryForm({ onSubmit, date, onDateChange }: QuickEntryFormProps) {
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)

  async function submit() {
    if (duration === 0) return
    setSubmitting(true)
    const result = await onSubmit({
      date,
      project_id: projectId || null,
      description,
      duration_minutes: duration,
    })
    setSubmitting(false)
    if (!result.error) {
      setDescription('')
      setDuration(0)
      descRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); submit() }}
      className="flex flex-wrap items-start gap-2"
    >
      <Textarea
        ref={descRef}
        autoFocus
        placeholder="What did you work on?"
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="min-w-48 flex-1 min-h-9 resize-none py-2 leading-5 bg-background"
      />

      <div className="w-44 shrink-0">
        <ProjectCombobox value={projectId} onValueChange={setProjectId} />
      </div>

      <div className="w-36 shrink-0">
        <DateDurationInput
          date={date}
          duration={duration}
          onDateChange={onDateChange}
          onDurationChange={setDuration}
        />
      </div>

      <Button type="submit" disabled={submitting || duration === 0} size="sm" className="h-9 gap-1.5">
        Add
        <span className="flex items-center justify-center rounded border border-current/30 px-1 py-0.5 font-mono text-[10px] opacity-50">
          ⌘↵
        </span>
      </Button>
    </form>
  )
}
