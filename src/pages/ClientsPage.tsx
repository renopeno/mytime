import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useClients } from '@/hooks/useClients'
import type { Client } from '@/types/app.types'
import { ClientList } from '@/components/clients/ClientList'
import { ClientForm } from '@/components/clients/ClientForm'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function ClientsPage() {
  const { clients, loading, deleteClient, updateClient, refetch } = useClients()
  const [formOpen, setFormOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    const { error } = await deleteClient(id)
    if (error) {
      toast.error('Failed to delete client')
    } else {
      toast.success('Client deleted')
    }
  }

  const handleToggleActive = async (client: Client) => {
    const { error } = await updateClient(client.id, { is_active: !client.is_active })
    if (error) {
      toast.error('Failed to update client')
    } else {
      toast.success(client.is_active ? 'Client deactivated' : 'Client reactivated')
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    const results = await Promise.all(ids.map((id) => deleteClient(id)))
    const failed = results.filter((r) => r.error).length
    if (failed > 0) {
      toast.error(`Failed to delete ${failed} client${failed !== 1 ? 's' : ''}`)
    } else {
      toast.success(`Deleted ${ids.length} client${ids.length !== 1 ? 's' : ''}`)
    }
  }

  const handleBulkToggleActive = async (clientsToToggle: Client[]) => {
    const results = await Promise.all(
      clientsToToggle.map((c) => updateClient(c.id, { is_active: !c.is_active }))
    )
    const failed = results.filter((r) => r.error).length
    if (failed > 0) {
      toast.error(`Failed to update ${failed} client${failed !== 1 ? 's' : ''}`)
    } else {
      toast.success(`Updated ${clientsToToggle.length} client${clientsToToggle.length !== 1 ? 's' : ''}`)
    }
  }

  const handleFormSuccess = () => {
    setSelectedClient(null)
    refetch()
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) setSelectedClient(null)
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  const active = clients.filter((c) => c.is_active)
  const inactive = clients.filter((c) => !c.is_active)

  return (
    <div className="space-y-6 px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-medium tracking-tight">Clients</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {active.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive
            {inactive.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {inactive.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <ClientList
            clients={active}
            emptyMessage="No active clients."
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onBulkDelete={handleBulkDelete}
            onBulkToggleActive={handleBulkToggleActive}
          />
        </TabsContent>

        <TabsContent value="inactive" className="mt-4">
          <ClientList
            clients={inactive}
            emptyMessage="No inactive clients."
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onBulkDelete={handleBulkDelete}
            onBulkToggleActive={handleBulkToggleActive}
          />
        </TabsContent>
      </Tabs>

      <ClientForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        client={selectedClient}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
