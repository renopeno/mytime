import { useState, useRef } from 'react'
import { Check } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { cn } from '@/lib/utils'

interface ProjectComboboxProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  inputClassName?: string
}

export function ProjectCombobox({ value, onValueChange, placeholder = 'Project', autoFocus, inputClassName }: ProjectComboboxProps) {
  const { projects } = useProjects()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  const selected = projects.find(p => p.id === value)
  const filtered = search
    ? projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.client?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : projects

  // Ghost text: first project whose name starts with the typed text
  const ghostProject = search
    ? projects.find(p => p.name.toLowerCase().startsWith(search.toLowerCase()))
    : null
  const ghostSuffix = ghostProject ? ghostProject.name.substring(search.length) : null

  function handleFocus() {
    setSearch('')
    setOpen(true)
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => {
      setOpen(false)
      setSearch('')
    }, 150)
  }

  function select(id: string) {
    clearTimeout(blurTimeout.current)
    onValueChange(id)
    setOpen(false)
    setSearch('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghostProject && !e.shiftKey) {
      e.preventDefault()
      select(ghostProject.id)
    }
    if (e.key === 'Enter' && ghostProject) {
      e.preventDefault()
      select(ghostProject.id)
    }
    if (e.key === 'Enter' && !ghostProject && filtered.length > 0) {
      e.preventDefault()
      select(filtered[0].id)
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
    }
  }

  const displayValue = open ? search : (selected?.name ?? '')

  return (
    <div className="relative w-full">
      {/* Ghost text overlay */}
      {open && ghostSuffix && (
        <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-3">
          <span className="invisible whitespace-pre text-sm">{search}</span>
          <span className="text-sm text-muted-foreground/40">{ghostSuffix}</span>
        </div>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={e => setSearch(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn("h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring", inputClassName)}
      />
      {open && (
        <div className="absolute top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => select('')}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
              !value && 'font-medium text-foreground'
            )}
          >
            No project
          </button>
          {filtered.map(project => (
            <button
              key={project.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => select(project.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className="flex-1 truncate text-left">
                {project.name}
                {project.client && (
                  <span className="text-muted-foreground"> · {project.client.name}</span>
                )}
              </span>
              {value === project.id && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No results</p>
          )}
        </div>
      )}
    </div>
  )
}
