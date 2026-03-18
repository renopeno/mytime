import { SettingsForm } from '@/components/settings/SettingsForm'
import { DevSettings } from '@/components/settings/DevSettings'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Settings</h1>
      <SettingsForm />
      {import.meta.env.DEV && <DevSettings />}
    </div>
  )
}
