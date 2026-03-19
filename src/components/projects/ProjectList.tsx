import { useState, useEffect, useMemo } from 'react'
import { Pencil, Trash2, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { useShiftSelect } from '@/hooks/useShiftSelect'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatCurrency } from '@/lib/format'
import type { ProjectWithClient } from '@/types/app.types'

interface ProjectListProps {
  projects: ProjectWithClient[]
  loggedMinutes?: Map<string, number>
  emptyMessage?: string
  onEdit: (project: ProjectWithClient) => void
  onDelete: (id: string) => void
  onToggleComplete: (project: ProjectWithClient) => void
  onBulkDelete: (ids: string[]) => void
  onBulkToggleComplete: (projects: ProjectWithClient[]) => void
}

export function ProjectList({
  projects,
  loggedMinutes,
  emptyMessage,
  onEdit,
  onDelete,
  onToggleComplete,
  onBulkDelete,
  onBulkToggleComplete,
}: ProjectListProps) {
  const isMobile = useIsMobile()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelected(new Set())
  }, [projects])

  const allSelected = projects.length > 0 && selected.size === projects.length
  const someSelected = selected.size > 0 && selected.size < projects.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(projects.map((p) => p.id)))
    }
  }

  const projectItems = useMemo(() => projects.map((p) => ({ id: p.id })), [projects])
  const { getClickHandler } = useShiftSelect(projectItems, selected, setSelected)

  const selectedProjects = projects.filter((p) => selected.has(p.id))

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage ?? 'No projects yet. Add your first project to get started.'}</p>
      </div>
    )
  }

  return (
    <>
      <BulkActionBar count={selected.size} open={selected.size > 0} onClose={() => setSelected(new Set())}>
        <Button
          variant="outline"
          size="sm"
          className="border-transparent bg-white/[0.08] text-white/90 hover:bg-white/[0.14] hover:text-white"
          onClick={() => {
            onBulkToggleComplete(selectedProjects)
            setSelected(new Set())
          }}
        >
          {selectedProjects[0]?.is_archived ? (
            <><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reactivate</>
          ) : (
            <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark completed</>
          )}
        </Button>
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogTrigger render={<Button variant="outline" size="sm" className="border-transparent bg-white/[0.08] text-white/90 hover:bg-white/[0.14] hover:text-white" />}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selected.size} project{selected.size !== 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected projects. Time entries linked to them will not be deleted but will lose their project assignment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onBulkDelete(Array.from(selected))
                  setSelected(new Set())
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </BulkActionBar>

    {isMobile ? (
      <div className="space-y-3">
        {projects.map((project) => {
          const estimate = project.estimated_hours
          const logged = (loggedMinutes?.get(project.id) ?? 0) / 60
          return (
            <div key={project.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <Checkbox
                    checked={selected.has(project.id)}
                    onClick={getClickHandler(project.id)}
                    aria-label={`Select ${project.name}`}
                  />
                  <span className="text-sm truncate">{project.name}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {estimate
                    ? `${logged % 1 === 0 ? logged : logged.toFixed(1)}h / ${estimate}h`
                    : `${logged % 1 === 0 ? logged : logged.toFixed(1)}h`}
                </span>
              </div>

              {/* Client + rate */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {project.client && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.client.color ?? '#6789b9' }}
                    />
                    {project.client.name}
                  </span>
                )}
                {project.hourly_rate ? (
                  <span>{formatCurrency(project.hourly_rate)}/hr</span>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 border-t pt-3">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onToggleComplete(project)}>
                  {project.is_archived ? (
                    <><RotateCcw className="mr-1 h-3.5 w-3.5" />Reactivate</>
                  ) : (
                    <><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Complete</>
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onEdit(project)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <AlertDialog open={deleteId === project.id} onOpenChange={(open) => setDeleteId(open ? project.id : null)}>
                  <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive" />}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &quot;{project.name}&quot;. Time entries linked to this project will not be deleted but will no longer have a project assigned.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(project.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead className="w-[180px]">Progress</TableHead>
            <TableHead className="w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} data-state={selected.has(project.id) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selected.has(project.id)}
                  onClick={getClickHandler(project.id)}
                  aria-label={`Select ${project.name}`}
                />
              </TableCell>
              <TableCell>{project.name}</TableCell>
              <TableCell>
                {project.client ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.client.color ?? '#6789b9' }}
                    />
                    {project.client.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {project.hourly_rate ? (
                  formatCurrency(project.hourly_rate)
                ) : (
                  <span className="text-muted-foreground">Default</span>
                )}
              </TableCell>
              <TableCell>
                {(() => {
                  const estimate = project.estimated_hours
                  if (!estimate) return <span className="text-muted-foreground">—</span>
                  const logged = (loggedMinutes?.get(project.id) ?? 0) / 60
                  const pct = (logged / estimate) * 100
                  const over = pct >= 100
                  const cx = 9, cy = 9, ringR = 5.5, dotR = 1.5
                  const dots = Array.from({ length: 8 }, (_, i) => {
                    const angle = ((i * 360) / 8 - 90) * (Math.PI / 180)
                    return { x: cx + ringR * Math.cos(angle), y: cy + ringR * Math.sin(angle) }
                  })
                  const filledCount = (pct / 100) * 8
                  return (
                    <div className="flex items-center gap-2.5">
                      <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
                        {dots.map((pos, i) => {
                          const filled = filledCount >= i + 1
                          const partial = !filled && filledCount > i
                          const opacity = partial ? filledCount - i : 1
                          let fill = '#c8c8c8'
                          if (filled || partial) fill = over ? '#C75042' : 'var(--status-paid)'
                          return (
                            <circle key={i} cx={pos.x} cy={pos.y} r={dotR} fill={fill} opacity={filled || partial ? opacity : 1} />
                          )
                        })}
                      </svg>
                      <span className={`text-xs ${over ? 'font-medium' : 'text-muted-foreground'}`} style={over ? { color: '#C75042' } : undefined}>
                        {logged % 1 === 0 ? logged : logged.toFixed(1)}h / {estimate}h
                      </span>
                    </div>
                  )
                })()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleComplete(project)} />}>
                        {project.is_archived ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {project.is_archived ? 'Reactivate' : 'Mark as completed'}
                    </TooltipContent>
                  </Tooltip>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(project)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog open={deleteId === project.id} onOpenChange={(open) => setDeleteId(open ? project.id : null)}>
                    <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" />}>
                      <Trash2 className="h-4 w-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{project.name}". Time entries linked to this project will not be deleted but will no longer have a project assigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(project.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    )}
    </>
  )
}
