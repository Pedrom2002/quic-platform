'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { deactivateMaterial, reactivateMaterial } from './actions'

export function MaterialStatusActions({
  materialId,
  active,
}: {
  materialId: string
  active: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (active && !confirm('Desativar este material?')) {
      return
    }

    startTransition(async () => {
      const result = active
        ? await deactivateMaterial(materialId)
        : await reactivateMaterial(materialId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(active ? 'Material desativado' : 'Material reativado')
    })
  }

  return (
    <Button
      variant={active ? 'destructive' : 'secondary'}
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending
        ? 'A guardar...'
        : active
          ? 'Desativar'
          : 'Reativar'}
    </Button>
  )
}
