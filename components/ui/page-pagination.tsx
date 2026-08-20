import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  if (page > 1) search.set('page', String(page))
  const query = search.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function PagePagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string
  params: Record<string, string | undefined>
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

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
