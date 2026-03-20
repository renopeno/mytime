import { useState, useRef } from 'react'
import { DurationInput } from './DurationInput'
import { ProjectCombobox } from './ProjectCombobox'

interface InlineEntryFormProps {
  date: string
  onSubmit: (entry: {
    date: string
    project_id: string | null
    description: string
    duration_minutes: number
  }) => Promise<{ error?: unknown }>
  onCancel: () => void
}

export function InlineEntryForm({ date, onSubmit, onCancel }: InlineEntryFormProps) {
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [duration, setDuration] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const durationRef = useRef(0)
  const descRef = useRef<HTMLInputElement>(null)

  async function submit() {
    const dur = durationRef.current
    if (dur === 0 || submitting) return
    setSubmitting(true)
    const result = await onSubmit({
      date,
      project_id: projectId || null,
      description,
      duration_minutes: dur,
    })
    setSubmitting(false)
    if (!result.error) {
      onCancel()
    }
  }

  function handleDurationChange(val: number) {
    durationRef.current = val
    setDuration(val)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel()
      return
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  function handleDurationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    handleKeyDown(e)
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex items-center gap-3 px-1 py-2 bg-muted/20">
      {/* Description */}
      <div className="min-w-0 flex-1">
        <input
          ref={descRef}
          type="text"
          autoFocus
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What did you work on?"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Project */}
      <div className="w-36 shrink-0" onKeyDown={handleKeyDown}>
        <ProjectCombobox
          value={projectId}
          onValueChange={setProjectId}
          inputClassName="h-7 rounded-md"
        />
      </div>

      {/* Status placeholder */}
      <div className="w-28 shrink-0" />

      {/* Duration */}
      <div className="w-14 shrink-0">
        <DurationInput
          value={duration}
          onChange={handleDurationChange}
          onKeyDown={handleDurationKeyDown}
          placeholder="0:00"
          className="h-7 w-full rounded-[10px] border px-1 text-right text-sm focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/50"
        />
      </div>

      {/* Spacer to align with row actions */}
      <div className="w-[84px] shrink-0" />
    </div>
  )
}
