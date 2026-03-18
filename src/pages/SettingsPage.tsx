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
      <h1 className="font-serif text-3xl font-medium tracking-tight">Settings</h1>
      <SettingsForm />

      {/* Import CSV section */}
      <div className="flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10">
        <div className="px-4">
          <h2 className="font-serif text-lg font-medium">Import CSV</h2>
        </div>
        <div className="space-y-3 px-4">
          <p className="text-sm text-muted-foreground">
            Import time entries from another time tracking tool (Toggl, Clockify, Harvest, or any CSV)
          </p>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-5xl flex max-h-[85vh] flex-col overflow-hidden">
          <ImportWizard onComplete={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>

      {import.meta.env.DEV && <DevSettings />}
    </div>
  )
}
