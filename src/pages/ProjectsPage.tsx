import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useProjects } from '@/hooks/useProjects'
import { useProjectProgress } from '@/hooks/useProjectProgress'
import { useSettings } from '@/hooks/useSettings'
import { ProjectList } from '@/components/projects/ProjectList'
import { ProjectForm } from '@/components/projects/ProjectForm'
import type { ProjectWithClient } from '@/types/app.types'

export default function ProjectsPage() {
  const { projects, loading, deleteProject, updateProject, refetch } = useProjects()
  const { loggedMinutes } = useProjectProgress()
  const { settings } = useSettings()
  const defaultRate = settings?.default_hourly_rate ?? 0
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithClient | null>(null)

  function handleEdit(project: ProjectWithClient) {
    setEditingProject(project)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditingProject(null)
    setFormOpen(true)
  }

  async function handleDelete(id: string) {
    const { error } = await deleteProject(id)
    if (error) {
      toast.error('Failed to delete project')
    } else {
      toast.success('Project deleted')
    }
  }

  async function handleToggleComplete(project: ProjectWithClient) {
    const { error } = await updateProject(project.id, { is_archived: !project.is_archived })
    if (error) {
      toast.error('Failed to update project')
    } else {
      toast.success(project.is_archived ? 'Project reactivated' : 'Project marked as completed')
    }
  }

  async function handleBulkDelete(ids: string[]) {
    const results = await Promise.all(ids.map((id) => deleteProject(id)))
    const failed = results.filter((r) => r.error).length
    if (failed > 0) {
      toast.error(`Failed to delete ${failed} project${failed !== 1 ? 's' : ''}`)
    } else {
      toast.success(`Deleted ${ids.length} project${ids.length !== 1 ? 's' : ''}`)
    }
  }

  async function handleBulkToggleComplete(projectsToToggle: ProjectWithClient[]) {
    const results = await Promise.all(
      projectsToToggle.map((p) => updateProject(p.id, { is_archived: !p.is_archived }))
    )
    const failed = results.filter((r) => r.error).length
    if (failed > 0) {
      toast.error(`Failed to update ${failed} project${failed !== 1 ? 's' : ''}`)
    } else {
      toast.success(`Updated ${projectsToToggle.length} project${projectsToToggle.length !== 1 ? 's' : ''}`)
    }
  }

  function handleFormSuccess() {
    refetch()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    )
  }

  const active = projects.filter((p) => !p.is_archived)
  const completed = projects.filter((p) => p.is_archived)

  return (
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Organize work by client and track progress
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
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
          <TabsTrigger value="completed">
            Completed
            {completed.length > 0 && (
              <Badge variant="muted" className="ml-2">{completed.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <ProjectList
            projects={active}
            loggedMinutes={loggedMinutes}
            emptyMessage="No active projects."
            onEdit={handleEdit}

            onToggleComplete={handleToggleComplete}
            onBulkDelete={handleBulkDelete}
            onBulkToggleComplete={handleBulkToggleComplete}
            defaultRate={defaultRate}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <ProjectList
            projects={completed}
            loggedMinutes={loggedMinutes}
            emptyMessage="No completed projects."
            onEdit={handleEdit}

            onToggleComplete={handleToggleComplete}
            onBulkDelete={handleBulkDelete}
            onBulkToggleComplete={handleBulkToggleComplete}
            defaultRate={defaultRate}
          />
        </TabsContent>
      </Tabs>

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
        onSuccess={handleFormSuccess}
        onDelete={handleDelete}
        defaultRate={defaultRate}
      />
    </div>
  )
}
