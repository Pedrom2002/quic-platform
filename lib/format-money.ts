const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}
