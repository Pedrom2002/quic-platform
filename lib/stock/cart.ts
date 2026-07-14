export type CartItem = {
  materialId: string
  name: string
  unit: string
  qty: number
}

export const CART_STORAGE_KEY = 'stock-plat-cart'

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find(
    (current) => current.materialId === item.materialId
  )
  if (existing) {
    return items.map((current) =>
      current.materialId === item.materialId
        ? { ...current, qty: current.qty + item.qty }
        : current
    )
  }
  return [...items, item]
}

export function removeItem(items: CartItem[], materialId: string): CartItem[] {
  return items.filter((current) => current.materialId !== materialId)
}

export function setQty(
  items: CartItem[],
  materialId: string,
  qty: number
): CartItem[] {
  const nextQty = Number.isFinite(qty) ? Math.max(1, Math.trunc(qty)) : 1
  return items.map((current) =>
    current.materialId === materialId ? { ...current, qty: nextQty } : current
  )
}

export function totalItems(items: CartItem[]): number {
  return items.reduce((sum, current) => sum + current.qty, 0)
}

export function parseCart(raw: string | null): CartItem[] {
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (entry): entry is CartItem =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as CartItem).materialId === 'string' &&
        typeof (entry as CartItem).name === 'string' &&
        typeof (entry as CartItem).unit === 'string' &&
        typeof (entry as CartItem).qty === 'number' &&
        Number.isInteger((entry as CartItem).qty) &&
        (entry as CartItem).qty > 0
    )
  } catch {
    return []
  }
}
