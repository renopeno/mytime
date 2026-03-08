import { useState, useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ClientListProps {
  clients: Client[]
  emptyMessage?: string
  onEdit: (client: Client) => void
  onDelete: (id: string) => void
  onToggleActive: (client: Client) => void
  onBulkDelete: (ids: string[]) => void
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
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
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

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
      <div className="fixed inset-x-0 bottom-0 z-50 translate-y-full transition-transform duration-300 ease-out data-[open=true]:translate-y-0" data-open={selected.size > 0}>
        <div className="flex items-center gap-3 bg-black px-6 py-4 text-white shadow-2xl">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
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
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
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
            <TableHead>Email</TableHead>
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
                  onCheckedChange={() => toggleOne(client.id)}
                  aria-label={`Select ${client.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: client.color ?? '#3b82f6' }}
                  />
                  {client.name}
                </div>
              </TableCell>
              <TableCell>{client.email ?? ''}</TableCell>
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId)
                  setDeleteId(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}
