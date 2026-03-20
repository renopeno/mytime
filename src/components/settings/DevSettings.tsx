import { useNavigate } from 'react-router'
import { Palette } from 'lucide-react'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'

export function DevSettings() {
  const navigate = useNavigate()
  const { updateSettings } = useSettings()

  const resetOnboarding = async () => {
    const result = await updateSettings({ onboarding_completed: false })
    if (result?.error) {
      toast.error('Failed to reset onboarding')
    } else {
      toast.success('Onboarding reset – refresh the page')
    }
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-dashed border-orange-300 bg-orange-50/50 dark:bg-orange-950/20">
      <div className="flex h-10 items-center bg-orange-100/50 px-6 dark:bg-orange-900/20">
        <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-orange-600">Development</p>
      </div>
      <div className="divide-y divide-orange-200/50 dark:divide-orange-800/30">
        <div className="flex items-center justify-between gap-6 px-6 py-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Onboarding</p>
            <p className="text-[13px] text-muted-foreground">Reset and re-run the setup wizard</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetOnboarding}>
            Reset
          </Button>
        </div>
        <div className="flex items-center justify-between gap-6 px-6 py-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Color Styleguide</p>
            <p className="text-[13px] text-muted-foreground">Browse all registered colors and tokens</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/dev/colors')}>
            <Palette className="mr-1.5 h-3.5 w-3.5" />
            Open
          </Button>
        </div>
      </div>
    </div>
  )
}
