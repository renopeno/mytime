import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useClients } from '@/hooks/useClients'
import type { Client } from '@/types/app.types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ColorSwatchPicker, SWATCH_COLORS } from '@/components/ui/color-swatch-picker'

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string(),
  hourly_rate: z.number().nullable(),
  is_active: z.boolean(),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface ClientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSuccess: () => void
}

export function ClientForm({ open, onOpenChange, client, onSuccess }: ClientFormProps) {
  const { createClient, updateClient } = useClients()
  const isEditing = !!client

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      color: SWATCH_COLORS[0].hex,
      hourly_rate: null,
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: client?.name ?? '',
        color: client?.color ?? SWATCH_COLORS[0].hex,
        hourly_rate: client?.hourly_rate ?? null,
        is_active: client?.is_active ?? true,
      })
    }
  }, [open, client, form])

  const onSubmit = async (values: ClientFormValues) => {
    if (isEditing && client) {
      const { error } = await updateClient(client.id, values)
      if (error) {
        toast.error('Failed to update client')
        return
      }
      toast.success('Client updated')
    } else {
      const { error } = await createClient(values)
      if (error) {
        toast.error('Failed to create client')
        return
      }
      toast.success('Client created')
    }
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Client' : 'Add Client'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* General */}
            <div className="overflow-hidden rounded-[10px] border border-[#eae3dc] bg-[#f9f4ef]">
              <div className="flex h-10 items-center bg-[#f0eae4]/50 px-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">General</p>
              </div>
              <div className="space-y-6 p-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <ColorSwatchPicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Billing */}
            <div className="overflow-hidden rounded-[10px] border border-[#eae3dc] bg-[#f9f4ef]">
              <div className="flex h-10 items-center bg-[#f0eae4]/50 px-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-muted-foreground">Billing</p>
              </div>
              <div className="space-y-6 p-6">
                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate (EUR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Uses default rate"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? null : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      {!field.value && (
                        <FormDescription>Leave empty to use default rate</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label className="!mt-0 cursor-pointer" onClick={() => field.onChange(!field.value)}>
                      Active
                    </Label>
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
