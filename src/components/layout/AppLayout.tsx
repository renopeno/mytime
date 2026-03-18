import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar'
import { Outlet } from 'react-router'
import { AppSidebar } from './Sidebar'
import { useSettings } from '@/hooks/useSettings'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

function MobileHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 -ml-1"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-serif text-xl font-medium tracking-tight leading-none">MyTime</span>
    </header>
  )
}

export function AppLayout() {
  const { settings, loading: settingsLoading, updateSettings } = useSettings()
  const showWizard = !settingsLoading && settings?.onboarding_completed === false

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar companyName={settings?.company_name} />
      <SidebarInset className="h-svh md:h-[calc(100svh-24px)]">
        <MobileHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
      {showWizard && (
        <OnboardingWizard
          onComplete={() => updateSettings({ onboarding_completed: true })}
        />
      )}
    </SidebarProvider>
  )
}
