import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  count: number
  open: boolean
  children: ReactNode
}

export function BulkActionBar({ count, open, children }: BulkActionBarProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 m-0 p-2 md:left-[calc(var(--sidebar-width)-1rem)] transition-all duration-300 ease-out',
        open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-950 px-6 py-4 text-white shadow-lg">
        <span className="text-sm font-medium">{count} selected</span>
        <div className="ml-auto flex gap-2">
          {children}
        </div>
      </div>
    </div>
  )
}
