import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useClients } from '@/hooks/useClients'
import type { Client } from '@/types/app.types'
import { ClientList } from '@/components/clients/ClientList'
import { ClientForm } from '@/components/clients/ClientForm'
import { Badge } from '@/components/ui/badge'
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

  const handleDelete = async (id: string, cascade = false) => {
    const { error } = await deleteClient(id, cascade)
    if (error) {
      toast.error('Failed to delete client')
    } else {
      toast.success(cascade ? 'Client and all related data deleted' : 'Client deleted')
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

  const handleBulkDelete = async (ids: string[], cascade = false) => {
    const results = await Promise.all(ids.map((id) => deleteClient(id, cascade)))
    const failed = results.filter((r) => r.error).length
    if (failed > 0) {
      toast.error(`Failed to delete ${failed} client${failed !== 1 ? 's' : ''}`)
    } else {
      toast.success(cascade
        ? `Deleted ${ids.length} client${ids.length !== 1 ? 's' : ''} and all related data`
        : `Deleted ${ids.length} client${ids.length !== 1 ? 's' : ''}`)
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

  const handleUpdateRate = async (id: string, rate: number | null) => {
    const { error } = await updateClient(id, { hourly_rate: rate })
    if (error) {
      toast.error('Failed to update rate')
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
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage your clients and their billing details
          </p>
        </div>
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
              <Badge variant="muted" className="ml-2">{active.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive
            {inactive.length > 0 && (
              <Badge variant="muted" className="ml-2">{inactive.length}</Badge>
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
            onUpdateRate={handleUpdateRate}
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
            onUpdateRate={handleUpdateRate}
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
