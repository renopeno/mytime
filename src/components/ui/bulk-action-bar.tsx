import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  count: number
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function BulkActionBar({ count, open, onClose, children }: BulkActionBarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-2 z-50 transition-all duration-300 ease-out',
        // Match SidebarInset bounds: inset variant has ml-0 (gap handles it) + mr-4
        // Add 8px (0.5rem) extra padding from main container edges
        'left-2 right-2',
        'md:left-[calc(var(--sidebar-current-width)+1rem+0.5rem)]',
        'md:right-[calc(1rem+0.5rem)]',
        open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-neutral-100 px-5 py-3.5 text-white shadow-lg">
        <span className="text-sm font-medium">{count} selected</span>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <button
            onClick={onClose}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Deselect all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
