import { useState, useEffect } from 'react'
import { Pencil, Trash2, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency } from '@/lib/format'
import type { ProjectWithClient } from '@/types/app.types'

interface ProjectListProps {
  projects: ProjectWithClient[]
  emptyMessage?: string
  onEdit: (project: ProjectWithClient) => void
  onDelete: (id: string) => void
  onToggleComplete: (project: ProjectWithClient) => void
  onBulkDelete: (ids: string[]) => void
  onBulkToggleComplete: (projects: ProjectWithClient[]) => void
}

export function ProjectList({
  projects,
  emptyMessage,
  onEdit,
  onDelete,
  onToggleComplete,
  onBulkDelete,
  onBulkToggleComplete,
}: ProjectListProps) {
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

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
      <div className="fixed inset-x-0 bottom-0 z-50 translate-y-full transition-transform duration-300 ease-out data-[open=true]:translate-y-0" data-open={selected.size > 0}>
        <div className="flex items-center gap-3 bg-black px-6 py-4 text-white shadow-2xl">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
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
              <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
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
          </div>
        </div>
      </div>

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
            <TableHead>Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead className="w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} data-state={selected.has(project.id) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selected.has(project.id)}
                  onCheckedChange={() => toggleOne(project.id)}
                  aria-label={`Select ${project.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </div>
              </TableCell>
              <TableCell>
                {project.client ? (
                  <Badge
                    variant="secondary"
                    style={{ backgroundColor: project.client.color + '20', color: project.client.color, borderColor: project.client.color + '40' }}
                    className="border"
                  >
                    {project.client.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
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
    </>
  )
}
