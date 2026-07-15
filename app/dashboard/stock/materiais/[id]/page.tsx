import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type {
  StockCategory,
  StockMaterial,
  StockMaterialUnit,
} from '@/lib/stock/types'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { MaterialForm } from '../material-form'
import { MaterialStatusActions } from '../material-status-actions'

export default async function EditarMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const [{ data: materialData }, { data: categoriesData }, { data: unitsData }] =
    await Promise.all([
      supabase.from('stock_materials').select('*').eq('id', id).single(),
      supabase.from('stock_categories').select('*').order('sort_order'),
      supabase
        .from('stock_material_units')
        .select('*')
        .eq('material_id', id)
        .order('codigo'),
    ])

  if (!materialData) {
    notFound()
  }

  const material = materialData as StockMaterial
  const categories = (categoriesData ?? []) as StockCategory[]
  const units = (unitsData ?? []) as StockMaterialUnit[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Editar material</h1>
            <Badge variant={material.active ? 'secondary' : 'outline'}>
              {material.active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{material.name}</p>
        </div>
        <MaterialStatusActions
          materialId={material.id}
          active={material.active}
        />
      </div>
      <MaterialForm categories={categories} material={material} />

      {units.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unidades ({units.length})</CardTitle>
            <CardDescription>
              Detalhe de cada unidade física deste material.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nº de série</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">
                        {unit.codigo ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.serial_number ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.condicao ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.localizacao ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{unit.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
