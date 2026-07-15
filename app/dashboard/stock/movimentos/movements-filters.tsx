'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import type { StockMovementType } from '@/lib/stock/types'
import { movementTypeLabels } from '@/lib/stock/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

const typeOptions = Object.entries(movementTypeLabels) as [
  StockMovementType,
  string,
][]

export function MovementsFilters({
  materials,
  events,
}: {
  materials: { id: string; name: string }[]
  events: { id: string; name: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentMaterial = searchParams.get('material') ?? ALL
  const currentEvent = searchParams.get('evento') ?? ALL
  const currentType = searchParams.get('tipo') ?? ALL

  function navigate(material: string, event: string, type: string) {
    const params = new URLSearchParams()
    if (material !== ALL) {
      params.set('material', material)
    }
    if (event !== ALL) {
      params.set('evento', event)
    }
    if (type !== ALL) {
      params.set('tipo', type)
    }
    const query = params.toString()
    router.replace(
      query
        ? `/dashboard/stock/movimentos?${query}`
        : '/dashboard/stock/movimentos'
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentMaterial}
        onValueChange={(value) => navigate(value ?? ALL, currentEvent, currentType)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Material" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os materiais</SelectItem>
          {materials.map((material) => (
            <SelectItem key={material.id} value={material.id}>
              {material.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentEvent}
        onValueChange={(value) => navigate(currentMaterial, value ?? ALL, currentType)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Evento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os eventos</SelectItem>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {event.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentType}
        onValueChange={(value) => navigate(currentMaterial, currentEvent, value ?? ALL)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os tipos</SelectItem>
          {typeOptions.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
