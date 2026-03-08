import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DevSettings() {
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
    <Card className="border-dashed border-orange-300 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="text-sm text-orange-600">Development</CardTitle>
        <CardDescription>Only visible in dev mode.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={resetOnboarding}>
          Reset onboarding
        </Button>
      </CardContent>
    </Card>
  )
}
