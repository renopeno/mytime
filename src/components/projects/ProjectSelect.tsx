import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/useProjects'

interface ProjectSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function ProjectSelect({ value, onValueChange, placeholder = 'Select project' }: ProjectSelectProps) {
  const { projects, loading } = useProjects()
  const selected = projects.find(p => p.id === value)
  const displayText = selected
    ? `${selected.name}${selected.client ? ` (${selected.client.name})` : ''}`
    : undefined

  return (
    <Select value={value || null} onValueChange={(val) => onValueChange(val ?? '')}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={loading ? 'Loading...' : placeholder}>
          {displayText}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">No project</SelectItem>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}{project.client ? ` (${project.client.name})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
