import { SettingsForm } from '@/components/settings/SettingsForm'
import { DevSettings } from '@/components/settings/DevSettings'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
      <h1 className="font-serif text-2xl font-medium tracking-tight">Settings</h1>
      <SettingsForm />
      {import.meta.env.DEV && <DevSettings />}
    </div>
  )
}
