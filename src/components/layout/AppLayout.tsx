import { useState } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Outlet } from 'react-router'
import { AppSidebar } from './Sidebar'
import { useSettings } from '@/hooks/useSettings'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

const getInitialPinned = () => {
  const match = document.cookie.match(/\bsidebar_state=([^;]+)/)
  return match ? match[1] !== 'false' : true
}

export function AppLayout() {
  const { settings, loading: settingsLoading, updateSettings } = useSettings()
  const showWizard = !settingsLoading && settings?.onboarding_completed === false

  const [pinned, setPinned] = useState(getInitialPinned)
  const [hovered, setHovered] = useState(false)

  const isOpen = pinned || hovered

  const handleOpenChange = (value: boolean) => {
    if (!pinned && hovered && !value) {
      setPinned(true)
      setHovered(false)
    } else {
      setPinned(value)
      if (!value) setHovered(false)
    }
  }

  return (
    <SidebarProvider open={isOpen} onOpenChange={handleOpenChange}>
      {/* Edge hover strip — active only when sidebar is not pinned */}
      {!pinned && (
        <div
          className="fixed left-0 top-0 h-full w-3 z-50"
          onMouseEnter={() => setHovered(true)}
          aria-hidden="true"
        />
      )}
      <div style={{ display: 'contents' }} onMouseLeave={() => { if (!pinned) setHovered(false) }}>
        <AppSidebar companyName={settings?.company_name} floating={!pinned} />
      </div>
      <SidebarInset className="m-3 h-[calc(100svh-24px)] rounded-[20px] shadow-sm">
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
