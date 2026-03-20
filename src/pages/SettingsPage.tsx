import { useState } from 'react'
import { Upload } from 'lucide-react'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { DevSettings } from '@/components/settings/DevSettings'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { ImportWizard } from '@/components/import/ImportWizard'

export default function SettingsPage() {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-serif text-3xl font-normal tracking-tight pt-4">Settings</h1>
      <SettingsForm />

      {/* Import */}
      <div className="overflow-hidden rounded-[10px] border border-neutral-30 bg-neutral-0">
        <div className="flex h-10 items-center bg-neutral-20/50 px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">Data</p>
        </div>
        <div className="flex items-center justify-between gap-6 px-6 py-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Import CSV</p>
            <p className="text-[13px] text-muted-foreground">From Toggl, Clockify, Harvest, or any CSV</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-5xl sm:h-[min(85vh,720px)]">
          <ImportWizard onComplete={() => setImportOpen(false)} onCancel={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>

      {import.meta.env.DEV && <DevSettings />}
    </div>
  )
}
