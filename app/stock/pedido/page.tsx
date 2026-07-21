'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ShoppingCartIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { useCart } from '@/components/stock-cart-provider'
import { Button, ButtonLink } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { submitQuoteRequest } from './actions'

export default function PedidoPage() {
  const { items, isReady, removeItem, setQty, clear } = useCart()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError(null)

    startTransition(async () => {
      const result = await submitQuoteRequest({
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        event_date: String(formData.get('event_date') ?? ''),
        message: String(formData.get('message') ?? ''),
        website: String(formData.get('website') ?? ''),
        items: items.map((item) => ({
          materialId: item.materialId,
          qty: item.qty,
        })),
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      clear()
      router.push('/stock/pedido/obrigado')
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 md:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Pedido de orçamento
        </h1>
        <p className="text-muted-foreground">
          Reveja os materiais escolhidos e deixe os seus contactos. Respondemos
          com um orçamento sem compromisso.
        </p>
      </div>

      {isReady && items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <ShoppingCartIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">O seu pedido está vazio</p>
          <p className="text-sm text-muted-foreground">
            Adicione materiais a partir do catálogo para pedir um orçamento.
          </p>
          <ButtonLink href="/stock" className="mt-2 bg-red-600 text-white hover:bg-red-700">
            Ver catálogo
          </ButtonLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_minmax(20rem,24rem)]">
          <Card>
            <CardHeader>
              <CardTitle>Materiais</CardTitle>
              <CardDescription>
                Ajuste as quantidades ou remova itens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {items.map((item) => (
                  <li
                    key={item.materialId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Unidade: {item.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10)
                        setQty(item.materialId, Number.isNaN(value) ? 1 : value)
                      }}
                      aria-label={`Quantidade de ${item.name}`}
                      className="w-20 text-right"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${item.name}`}
                      onClick={() => removeItem(item.materialId)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Os seus dados</CardTitle>
              <CardDescription>
                Usamos estes contactos apenas para responder ao pedido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pedido-name">Nome *</Label>
                  <Input
                    id="pedido-name"
                    name="name"
                    autoComplete="name"
                    placeholder="O seu nome"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="pedido-email">Email *</Label>
                  <Input
                    id="pedido-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome@exemplo.pt"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="pedido-phone">Telefone</Label>
                  <Input
                    id="pedido-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Opcional"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="pedido-date">Data do evento</Label>
                  <Input id="pedido-date" name="event_date" type="date" />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="pedido-message">Mensagem</Label>
                  <Textarea
                    id="pedido-message"
                    name="message"
                    rows={4}
                    placeholder="Conte-nos mais sobre o evento (opcional)"
                  />
                </div>

                {/* Honeypot anti-spam: escondido de utilizadores reais */}
                <div aria-hidden="true" className="sr-only">
                  <label htmlFor="pedido-website">Website</label>
                  <input
                    id="pedido-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isPending || !isReady}
                  className="bg-black text-white hover:bg-black/90"
                >
                  {isPending ? 'A enviar...' : 'Enviar pedido'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
