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
          <span className="flex flex-1 text-left text-sm">{selectedClient.name}</span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">No client</SelectItem>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
