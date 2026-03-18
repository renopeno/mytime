import { useState } from 'react'
import { Upload } from 'lucide-react'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { DevSettings } from '@/components/settings/DevSettings'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImportWizard } from '@/components/import/ImportWizard'

export default function SettingsPage() {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Settings</h1>
      <SettingsForm />

      {/* Import CSV section */}
      <div className="space-y-3 rounded-lg border p-6">
        <div>
          <h2 className="font-serif text-lg font-medium">Import CSV</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Import time entries from another time tracking tool (Toggl, Clockify, Harvest, or any CSV)
          </p>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Import CSV</DialogTitle>
          </DialogHeader>
          <ImportWizard onComplete={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>

      {import.meta.env.DEV && <DevSettings />}
    </div>
  )
}
