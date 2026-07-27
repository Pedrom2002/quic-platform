'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

import type { StockCatalogMaterial } from '@/lib/stock/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

import { AddToCartButton } from './add-to-cart-button'

export function CatalogInfinite({
  initialMaterials,
  initialHasMore,
  params,
  categoryNames,
}: {
  initialMaterials: StockCatalogMaterial[]
  initialHasMore: boolean
  params: { q?: string; categoria?: string }
  categoryNames: Record<string, string>
}) {
  const [materials, setMaterials] = useState(initialMaterials)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset when the search/category filters change (parent re-mounts via key,
  // but guard here too so a prop change re-seeds the list).
  useEffect(() => {
    setMaterials(initialMaterials)
    setPage(1)
    setHasMore(initialHasMore)
  }, [initialMaterials, initialHasMore])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const search = new URLSearchParams()
      if (params.q) search.set('q', params.q)
      if (params.categoria) search.set('categoria', params.categoria)
      search.set('page', String(nextPage))

      const res = await fetch(`/api/rentals/catalog?${search.toString()}`)
      if (!res.ok) return
      const json = (await res.json()) as {
        materials: StockCatalogMaterial[]
        hasMore: boolean
      }
      setMaterials((prev) => [...prev, ...json.materials])
      setPage(nextPage)
      setHasMore(json.hasMore)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, params.q, params.categoria])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore()
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore, hasMore])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {materials.map((material) => (
          <Card key={material.id}>
            {material.photo_url && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-white">
                <Image
                  src={material.photo_url}
                  alt={material.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-contain"
                />
              </div>
            )}
            <CardContent className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {material.category_id
                    ? (categoryNames[material.category_id] ?? 'Outros')
                    : 'Outros'}
                </p>
                <Badge
                  variant={material.available ? 'subtle' : 'outline'}
                  className="shrink-0"
                >
                  {material.available ? 'Disponível' : 'Sob consulta'}
                </Badge>
              </div>
              <h2 className="font-heading leading-snug font-semibold">
                {material.name}
              </h2>
            </CardContent>
            <CardFooter className="border-0 bg-transparent pt-0">
              <AddToCartButton
                materialId={material.id}
                name={material.name}
                unit={material.unit}
              />
            </CardFooter>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-6 text-sm text-muted-foreground"
        >
          {loading ? 'A carregar mais…' : ''}
        </div>
      )}
    </div>
  )
}
