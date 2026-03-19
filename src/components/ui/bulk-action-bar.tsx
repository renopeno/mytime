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
        'fixed bottom-0 right-0 z-50 p-2 transition-all duration-300 ease-out',
        'left-0 md:left-[var(--sidebar-current-width)]',
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
