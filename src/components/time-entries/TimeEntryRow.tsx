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
  isMobile?: boolean
}

type EditingField = 'description' | 'project' | 'duration' | null

export function TimeEntryRow({ entry, settings, onDelete, onDuplicate, onUpdate, isMobile }: TimeEntryRowProps) {
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

  if (isMobile) {
    const rate = resolveHourlyRate(entry.project, entry.project?.client, settings)
    const amount = rate * (entry.duration_minutes / 60)
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        {/* Top row: project + color dot at left, duration at right */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {entry.project ? (
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.project.color }}
                />
                <span className="truncate">{entry.project.name}</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">No project</span>
            )}
          </div>
          <span className="shrink-0 text-sm font-semibold">
            {formatDuration(entry.duration_minutes)}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground truncate">
          {entry.description || <span className="italic">No description</span>}
        </p>

        {/* Status + amount */}
        <div className="flex items-center gap-2">
          {entry.is_paid ? (
            <Badge className="bg-status-paid text-xs text-white/90">Paid</Badge>
          ) : entry.is_invoiced ? (
            <Badge className="bg-status-invoiced text-xs text-black/60">Invoiced</Badge>
          ) : (
            <Badge className="bg-status-not-paid text-xs text-black/60">Not paid</Badge>
          )}
          <span className="text-xs text-muted-foreground/60">
            {formatCurrency(amount)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-t pt-3">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onDuplicate(entry)}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Duplicate
          </Button>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive" />}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
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
              <span className="flex items-center gap-1.5 text-sm">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.project.color }}
                />
                <span className="truncate">{entry.project.name}</span>
              </span>
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
              <Badge className="cursor-pointer bg-status-paid text-xs text-white/90">Paid</Badge>
            ) : entry.is_invoiced ? (
              <Badge className="cursor-pointer bg-status-invoiced text-xs text-black/60">Invoiced</Badge>
            ) : (
              <Badge className="cursor-pointer bg-status-not-paid text-xs text-black/60">Not paid</Badge>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-36 gap-0 p-1" align="start">
            <button
              type="button"
              onClick={() => setStatus(false, false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="h-2 w-2 rounded-full bg-status-not-paid" />
              Not paid
            </button>
            <button
              type="button"
              onClick={() => setStatus(true, false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="h-2 w-2 rounded-full bg-status-invoiced" />
              Invoiced
            </button>
            <button
              type="button"
              onClick={() => setStatus(true, true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="h-2 w-2 rounded-full bg-status-paid" />
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
