import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ProjectWithClient } from '@/types/app.types'
import { devGetProjects, devCreateProject, devUpdateProject, devDeleteProject } from '@/lib/dev-db'

const DEV = import.meta.env.DEV

export function useProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    if (!user) return
    setLoading(true)
    if (DEV) {
      setProjects(devGetProjects())
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('projects')
      .select('*, client:clients(*)')
      .eq('user_id', user.id)
      .order('name')
    setProjects((data as ProjectWithClient[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const createProject = async (project: { name: string; client_id?: string | null; description?: string; color?: string; type?: string; hourly_rate?: number | null; estimated_hours?: number | null; is_archived?: boolean }) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    if (DEV) {
      const data = devCreateProject({ ...project, user_id: user.id, client_id: project.client_id ?? null, description: project.description ?? null, color: project.color ?? '#6b7280', type: project.type ?? 'web_design', hourly_rate: project.hourly_rate ?? null, estimated_hours: project.estimated_hours ?? null, is_archived: false })
      await fetchProjects()
      return { data, error: null }
    }
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, user_id: user.id })
      .select('*, client:clients(*)')
      .single()
    if (!error) await fetchProjects()
    return { data, error }
  }

  const updateProject = async (id: string, updates: { name?: string; client_id?: string | null; description?: string; color?: string; type?: string; hourly_rate?: number | null; estimated_hours?: number | null; is_archived?: boolean }) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    if (DEV) {
      devUpdateProject(id, updates)
      await fetchProjects()
      return { data: null, error: null }
    }
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) await fetchProjects()
    return { data: null, error }
  }

  const deleteProject = async (id: string) => {
    if (!user) return { error: new Error('Not authenticated') }
    if (DEV) {
      devDeleteProject(id)
      await fetchProjects()
      return { error: null }
    }
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    if (!error) await fetchProjects()
    return { error }
  }

  return { projects, loading, createProject, updateProject, deleteProject, refetch: fetchProjects }
}
