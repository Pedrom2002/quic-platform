import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function buildHref(
  basePath: string,
  params: { q?: string; categoria?: string },
  page: number
) {
  const search = new URLSearchParams()
  if (params.q) {
    search.set('q', params.q)
  }
  if (params.categoria) {
    search.set('categoria', params.categoria)
  }
  if (page > 1) {
    search.set('page', String(page))
  }
  const query = search.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function CatalogPagination({
  basePath = '/rentals',
  params,
  page,
  totalPages,
}: {
  basePath?: string
  params: { q?: string; categoria?: string }
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) {
    return null
  }

  const hasPrevious = page > 1
  const hasNext = page < totalPages

  return (
    <div className="flex items-center justify-between gap-4">
      {hasPrevious ? (
        <ButtonLink href={buildHref(basePath, params, page - 1)} variant="outline">
          Anterior
        </ButtonLink>
      ) : (
        <span className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-50')}>
          Anterior
        </span>
      )}
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      {hasNext ? (
        <ButtonLink href={buildHref(basePath, params, page + 1)} variant="outline">
          Seguinte
        </ButtonLink>
      ) : (
        <span className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-50')}>
          Seguinte
        </span>
      )}
    </div>
  )
}
