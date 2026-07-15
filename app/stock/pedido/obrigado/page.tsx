import type { Metadata } from 'next'
import { CircleCheckIcon } from 'lucide-react'

import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Pedido enviado',
}

export default function ObrigadoPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <CircleCheckIcon aria-hidden="true" className="size-12 text-red-600" />
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Pedido enviado
      </h1>
      <p className="max-w-md text-muted-foreground">
        Obrigado! Recebemos o seu pedido de orçamento e entraremos em contacto
        brevemente.
      </p>
      <ButtonLink href="/stock" className="mt-2 bg-red-600 text-white hover:bg-red-700">
        Voltar ao catálogo
      </ButtonLink>
    </div>
  )
}
