import { useState, useRef } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDuration } from '@/lib/duration'
import { formatCurrency } from '@/lib/format'
import { resolveHourlyRate } from '@/lib/rate'
import { DurationInput } from './DurationInput'
import { ProjectCombobox } from './ProjectCombobox'
import type { TimeEntryWithProject, Settings } from '@/types/app.types'

interface TimeEntryRowProps {
  entry: TimeEntryWithProject
  settings: Settings | null
  onDelete: (id: string) => void
  onDuplicate: (entry: TimeEntryWithProject) => void
  onUpdate: (id: string, updates: {
    project_id?: string | null
    description?: string
    duration_minutes?: number
    is_paid?: boolean
    is_invoiced?: boolean
  }) => Promise<{ error?: unknown }>
}

type EditingField = 'description' | 'project' | 'duration' | null

export function TimeEntryRow({ entry, settings, onDelete, onDuplicate, onUpdate }: TimeEntryRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [description, setDescription] = useState(entry.description)
  const [multiline, setMultiline] = useState(false)
  const [projectId, setProjectId] = useState(entry.project_id ?? '')
  const [duration, setDuration] = useState(entry.duration_minutes)
  // Ref always holds the latest duration to avoid React batching issues on blur
  const durationRef = useRef(entry.duration_minutes)

  function startEdit(field: EditingField) {
    if (field === 'description') setDescription(entry.description)
    if (field === 'project') setProjectId(entry.project_id ?? '')
    if (field === 'duration') {
      setDuration(entry.duration_minutes)
      durationRef.current = entry.duration_minutes
    }
    setEditingField(field)
  }

  function handleDurationChange(val: number) {
    durationRef.current = val
    setDuration(val)
  }

  async function saveDescription() {
    setEditingField(null)
    setMultiline(false)
    if (description === entry.description) return
    await onUpdate(entry.id, { description })
  }

  async function saveProject(id: string) {
    setProjectId(id)
    setEditingField(null)
    if (id !== (entry.project_id ?? '')) {
      await onUpdate(entry.id, { project_id: id || null })
    }
  }

  async function saveDuration() {
    const val = durationRef.current
    setEditingField(null)
    if (val === entry.duration_minutes) return
    await onUpdate(entry.id, { duration_minutes: val })
  }

  async function setStatus(invoiced: boolean, paid: boolean) {
    setStatusOpen(false)
    await onUpdate(entry.id, { is_invoiced: invoiced, is_paid: paid })
  }

  return (
    <div className={`group flex ${multiline ? 'items-start' : 'items-center'} gap-3 px-1 py-2 hover:bg-muted/30`}>
      {/* Description */}
      <div className="min-w-0 flex-1">
        {editingField === 'description' ? (
          multiline ? (
            <Textarea
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={saveDescription}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDescription() }
                if (e.key === 'Escape') { setDescription(entry.description); setEditingField(null); setMultiline(false) }
              }}
              rows={2}
              className="resize-none py-0.5 text-sm leading-5"
            />
          ) : (
            <input
              type="text"
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={saveDescription}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); setMultiline(true) }
                else if (e.key === 'Enter') { e.preventDefault(); saveDescription() }
                if (e.key === 'Escape') { setDescription(entry.description); setEditingField(null) }
              }}
              className="w-full bg-transparent text-sm outline-none"
            />
          )
        ) : (
          <p
            className="cursor-text truncate text-sm"
            onClick={() => startEdit('description')}
          >
            {entry.description || <span className="italic text-muted-foreground">No description</span>}
          </p>
        )}
      </div>

      {/* Project */}
      <div
        className="w-36 shrink-0"
        onBlur={e => {
          if (editingField === 'project' && !e.currentTarget.contains(e.relatedTarget as Node)) {
            setEditingField(null)
          }
        }}
      >
        {editingField === 'project' ? (
          <ProjectCombobox value={projectId} onValueChange={saveProject} autoFocus inputClassName="h-7 rounded-md" />
        ) : (
          <div className="cursor-pointer" onClick={() => startEdit('project')}>
            {entry.project ? (
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: entry.project.color + '20',
                  color: entry.project.color,
                  borderColor: entry.project.color + '40',
                }}
                className="max-w-full truncate border text-xs"
              >
                {entry.project.name}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        )}
      </div>

      {/* Status dropdown */}
      <div className="flex w-28 shrink-0 items-center">
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger render={<div className="cursor-pointer" />}>
            {entry.is_paid ? (
              <Badge className="cursor-pointer bg-green-600 text-xs hover:bg-green-700">Paid</Badge>
            ) : entry.is_invoiced ? (
              <Badge className="cursor-pointer border border-amber-300 bg-amber-100 text-xs text-amber-700 hover:bg-amber-200">Invoice sent</Badge>
            ) : (
              <Badge variant="secondary" className="cursor-pointer text-xs">Not paid</Badge>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-36 gap-0 p-1" align="start">
            <button
              type="button"
              onClick={() => setStatus(false, false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              Not paid
            </button>
            <button
              type="button"
              onClick={() => setStatus(true, false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Invoice sent
            </button>
            <button
              type="button"
              onClick={() => setStatus(true, true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Paid
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Duration */}
      <div
        className="w-14 shrink-0"
        onBlur={e => {
          if (editingField === 'duration' && !e.currentTarget.contains(e.relatedTarget as Node)) {
            saveDuration()
          }
        }}
      >
        {editingField === 'duration' ? (
          <DurationInput
            autoFocus
            value={duration}
            onChange={handleDurationChange}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); saveDuration() }
              if (e.key === 'Escape') { setDuration(entry.duration_minutes); setEditingField(null) }
            }}
            className="h-7 w-full rounded border px-1 text-right text-sm focus-visible:ring-1 focus-visible:ring-offset-0"
          />
        ) : (
          <span
            className="block cursor-text text-right text-sm"
            onClick={() => startEdit('duration')}
          >
            {formatDuration(entry.duration_minutes)}
          </span>
        )}
      </div>

      {/* Amount (read-only) */}
      <div className="w-20 shrink-0 text-right text-sm text-muted-foreground/60">
        {formatCurrency(
          resolveHourlyRate(entry.project, entry.project?.client, settings) *
            (entry.duration_minutes / 60)
        )}
      </div>

      {/* Actions - duplicate + delete only */}
      <div className="flex w-[84px] shrink-0 justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(entry)} />}>
            <Copy className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent>Duplicate</TooltipContent>
        </Tooltip>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" />}>
            <Trash2 className="h-3.5 w-3.5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this time entry. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(entry.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
