import { useClients } from '@/hooks/useClients'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ClientSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function ClientSelect({ value, onValueChange, placeholder = 'Select client' }: ClientSelectProps) {
  const { clients } = useClients()
  const selectedClient = clients.find((c) => c.id === value)

  return (
    <Select value={value || null} onValueChange={(val) => onValueChange(val ?? '')}>
      <SelectTrigger>
        {selectedClient ? (
          <span className="flex flex-1 items-center gap-2 text-left text-sm">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selectedClient.color ?? '#6789b9' }}
            />
            {selectedClient.name}
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">No client</SelectItem>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: client.color ?? '#6789b9' }}
              />
              {client.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
