'use client'

import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useCart } from '@/components/stock-cart-provider'
import { Button } from '@/components/ui/button'

export function AddToCartButton({
  materialId,
  name,
  unit,
}: {
  materialId: string
  name: string
  unit: string
}) {
  const { addItem } = useCart()

  return (
    <Button
      type="button"
      className="w-full bg-black text-white hover:bg-black/90"
      onClick={() => {
        addItem({ materialId, name, unit, qty: 1 })
        toast.success('Adicionado ao pedido', { description: name })
      }}
    >
      <PlusIcon className="size-4" />
      Adicionar ao pedido
    </Button>
  )
}
