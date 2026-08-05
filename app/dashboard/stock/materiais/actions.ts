'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as z from 'zod'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { createClient } from '@/lib/supabase/server'
import { materialSchema } from '@/lib/stock/validation'

export type ActionResult = { error?: string }

async function getTeamClient() {
  try {
    const { member } = await requireOrgAuth()
    if (member.role !== 'admin' && member.role !== 'manager') {
      return null
    }
    return await createClient()
  } catch {
    return null
  }
}

function issuesToMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join('; ')
}

function parseMaterialForm(formData: FormData) {
  const categoryId = formData.get('category_id')

  return materialSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? undefined,
    category_id: categoryId ? String(categoryId) : null,
    unit: formData.get('unit'),
    quantity_total: formData.get('quantity_total'),
    is_public: formData.get('is_public') === 'on',
    active: formData.get('active') === 'on',
  })
}

// Formatos raster permitidos. Deliberadamente sem SVG: o bucket 'materials' é
// público e um SVG servido inline pode conter <script> (XSS na origem do
// storage). A extensão e o content-type são derivados do conteúdo real do
// ficheiro (magic bytes), nunca do photo.type/photo.name enviados pelo cliente.
const RASTER_SIGNATURES: { ext: string; mime: string; match: (b: Uint8Array) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'gif', mime: 'image/gif', match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  {
    ext: 'webp',
    mime: 'image/webp',
    match: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
]

// Faz upload da foto (se existir) para o bucket 'materials' com o cliente de
// servidor (sessão do utilizador; a RLS is_stock_team() do storage aplica-se).
// Devolve o URL público ou null quando não há ficheiro.
// Sem limite de tamanho aqui de propósito (replica o Stock-Plat original), mas
// o next.config.ts define bodySizeLimit: '50mb' para Server Actions - ficheiros
// maiores falham antes de chegar aqui, com um erro genérico da framework.
async function uploadPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<{ photoUrl: string | null; error?: string }> {
  const photo = formData.get('photo')

  if (!(photo instanceof File) || photo.size === 0) {
    return { photoUrl: null }
  }

  // Sniff dos primeiros bytes: confirma que é mesmo um raster suportado e
  // define ext + content-type a partir do conteúdo, não do que o cliente diz.
  const header = new Uint8Array(await photo.slice(0, 16).arrayBuffer())
  const format = RASTER_SIGNATURES.find((sig) => sig.match(header))
  if (!format) {
    return {
      photoUrl: null,
      error: 'A foto tem de ser uma imagem (JPEG, PNG, GIF ou WebP)',
    }
  }

  const path = `${crypto.randomUUID()}.${format.ext}`

  const { error } = await supabase.storage
    .from('materials')
    .upload(path, photo, { contentType: format.mime })
  if (error) {
    return { photoUrl: null, error: 'Erro ao carregar a foto' }
  }

  const { data } = supabase.storage.from('materials').getPublicUrl(path)
  return { photoUrl: data.publicUrl }
}

export async function createMaterial(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const parsed = parseMaterialForm(formData)
  if (!parsed.success) {
    return { error: issuesToMessage(parsed.error) }
  }

  const { photoUrl, error: photoError } = await uploadPhoto(supabase, formData)
  if (photoError) {
    return { error: photoError }
  }

  const { error } = await supabase.from('stock_materials').insert({
    ...parsed.data,
    photo_url: photoUrl,
  })
  if (error) {
    return { error: 'Erro ao criar material' }
  }

  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard/stock/materiais')
  redirect('/dashboard/stock/materiais')
}

export async function updateMaterial(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) {
    return { error: 'Material inválido' }
  }

  const parsed = parseMaterialForm(formData)
  if (!parsed.success) {
    return { error: issuesToMessage(parsed.error) }
  }

  const { photoUrl, error: photoError } = await uploadPhoto(supabase, formData)
  if (photoError) {
    return { error: photoError }
  }

  // Sem foto nova, a coluna photo_url mantém o valor existente.
  const { error } = await supabase
    .from('stock_materials')
    .update({
      ...parsed.data,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq('id', id.data)
  if (error) {
    return { error: 'Erro ao atualizar material' }
  }

  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard/stock/materiais')
  revalidatePath(`/dashboard/stock/materiais/${id.data}`)
  redirect('/dashboard/stock/materiais')
}

// Apagar material = soft delete (active = false) para não partir FKs de
// movimentos e pedidos.
export async function deactivateMaterial(id: string): Promise<ActionResult> {
  return setMaterialActive(id, false)
}

export async function reactivateMaterial(id: string): Promise<ActionResult> {
  return setMaterialActive(id, true)
}

async function setMaterialActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const supabase = await getTeamClient()
  if (!supabase) {
    return { error: 'Sem permissões de equipa' }
  }

  const parsedId = z.uuid().safeParse(id)
  if (!parsedId.success) {
    return { error: 'Material inválido' }
  }

  const { error } = await supabase
    .from('stock_materials')
    .update({ active })
    .eq('id', parsedId.data)
  if (error) {
    return {
      error: active
        ? 'Erro ao reativar material'
        : 'Erro ao desativar material',
    }
  }

  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard/stock/materiais')
  revalidatePath(`/dashboard/stock/materiais/${parsedId.data}`)
  return {}
}
