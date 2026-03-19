import { useState, useEffect, useMemo } from 'react'
import { Pencil, Trash2, UserMinus, UserPlus } from 'lucide-react'
import type { Client } from '@/types/app.types'
import { formatCurrency } from '@/lib/format'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { useShiftSelect } from '@/hooks/useShiftSelect'
import { useIsMobile } from '@/hooks/use-mobile'

interface ClientListProps {
  clients: Client[]
  emptyMessage?: string
  onEdit: (client: Client) => void
  onDelete: (id: string, cascade?: boolean) => void
  onToggleActive: (client: Client) => void
  onBulkDelete: (ids: string[], cascade?: boolean) => void
  onBulkToggleActive: (clients: Client[]) => void
}

export function ClientList({
  clients,
  emptyMessage,
  onEdit,
  onDelete,
  onToggleActive,
  onBulkDelete,
  onBulkToggleActive,
}: ClientListProps) {
  const isMobile = useIsMobile()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [cascadeDelete, setCascadeDelete] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkCascadeDelete, setBulkCascadeDelete] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelected(new Set())
  }, [clients])

  const allSelected = clients.length > 0 && selected.size === clients.length
  const someSelected = selected.size > 0 && selected.size < clients.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clients.map((c) => c.id)))
    }
  }

  const clientItems = useMemo(() => clients.map((c) => ({ id: c.id })), [clients])
  const { getClickHandler } = useShiftSelect(clientItems, selected, setSelected)

  const selectedClients = clients.filter((c) => selected.has(c.id))

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-center">
          {emptyMessage ?? 'No clients yet. Add your first client to get started.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <BulkActionBar count={selected.size} open={selected.size > 0}>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          onClick={() => {
            onBulkToggleActive(selectedClients)
            setSelected(new Set())
          }}
        >
          {selectedClients[0]?.is_active ? (
            <><UserMinus className="mr-1.5 h-3.5 w-3.5" />Deactivate</>
          ) : (
            <><UserPlus className="mr-1.5 h-3.5 w-3.5" />Reactivate</>
          )}
        </Button>
        <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => { setBulkDeleteOpen(open); if (!open) setBulkCascadeDelete(false) }}>
          <AlertDialogTrigger render={<Button variant="outline" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" />}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selected.size} client{selected.size !== 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the selected clients? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <Checkbox
                checked={bulkCascadeDelete}
                onCheckedChange={(v) => setBulkCascadeDelete(v === true)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none">Also delete projects & time entries</p>
                <p className="text-xs text-muted-foreground">Remove all projects and tracked time associated with these clients</p>
              </div>
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onBulkDelete(Array.from(selected), bulkCascadeDelete)
                  setSelected(new Set())
                  setBulkCascadeDelete(false)
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
        {clients.map((client) => (
          <div key={client.id} className="rounded-lg border bg-card p-4 space-y-3">
            {/* Top row: name at left, rate at right */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium truncate">{client.name}</span>
              <span className="shrink-0 text-sm font-semibold">
                {client.hourly_rate != null ? (
                  `${formatCurrency(client.hourly_rate)}/hr`
                ) : (
                  <span className="text-muted-foreground">Default</span>
                )}
              </span>
            </div>

            {/* Status badge */}
            <div>
              <Badge variant={client.is_active ? 'default' : 'secondary'} className="text-xs">
                {client.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 border-t pt-3">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onToggleActive(client)}>
                {client.is_active ? (
                  <><UserMinus className="mr-1 h-3.5 w-3.5" />Deactivate</>
                ) : (
                  <><UserPlus className="mr-1 h-3.5 w-3.5" />Reactivate</>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onEdit(client)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive" onClick={() => setDeleteId(client.id)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        ))}

        <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setCascadeDelete(false) } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this client? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <Checkbox
                checked={cascadeDelete}
                onCheckedChange={(v) => setCascadeDelete(v === true)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none">Also delete projects & time entries</p>
                <p className="text-xs text-muted-foreground">Remove all projects and tracked time associated with this client</p>
              </div>
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteId) {
                    onDelete(deleteId, cascadeDelete)
                    setDeleteId(null)
                    setCascadeDelete(false)
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
            <TableHead>Name</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead className="w-28 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} data-state={selected.has(client.id) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selected.has(client.id)}
                  onClick={getClickHandler(client.id)}
                  aria-label={`Select ${client.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                {client.name}
              </TableCell>
              <TableCell>
                {client.hourly_rate != null ? (
                  formatCurrency(client.hourly_rate)
                ) : (
                  <span className="text-muted-foreground">Default</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => onToggleActive(client)} />}>
                      {client.is_active ? (
                        <UserMinus className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {client.is_active ? 'Deactivate' : 'Reactivate'}
                  </TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(client.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setCascadeDelete(false) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
            <Checkbox
              checked={cascadeDelete}
              onCheckedChange={(v) => setCascadeDelete(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium leading-none">Also delete projects & time entries</p>
              <p className="text-xs text-muted-foreground">Remove all projects and tracked time associated with this client</p>
            </div>
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId, cascadeDelete)
                  setDeleteId(null)
                  setCascadeDelete(false)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    )}
    </>
  )
}
