// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { CartProvider } from '@/components/stock-cart-provider'
import { PublicHeader } from '@/app/rentals/public-header'

afterEach(() => {
  cleanup()
})

function renderHeader() {
  return render(
    <CartProvider>
      <PublicHeader />
    </CartProvider>
  )
}

describe('PublicHeader (marca QUIC)', () => {
  it('usa fundo preto da marca QUIC no header', () => {
    renderHeader()
    const header = screen.getByRole('banner')
    expect(header.className).toContain('bg-[var(--quic-black)]')
  })

  it('usa o logo branco', () => {
    renderHeader()
    const logo = screen.getByAltText('Quic')
    expect(logo.getAttribute('src')).toContain('logo-branco')
  })

  it('mantém o link para o catálogo e o botão de pedido', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/rentals')
    expect(screen.getByRole('link', { name: /Pedido/i })).toHaveAttribute('href', '/rentals/pedido')
  })
})
