// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ auth: { signOut: vi.fn() } })),
}))

import { Sidebar } from '@/components/dashboard/Sidebar'

describe('Sidebar accessibility', () => {
  afterEach(cleanup)

  it('Settings link has accessible label', () => {
    render(<Sidebar userName="Test User" userEmail="test@test.com" orgName="Org" />)
    const settingsLink = screen.getByRole('link', { name: /definições/i })
    expect(settingsLink).toBeInTheDocument()
  })

  it('logout button has accessible text', () => {
    render(<Sidebar userName="Test User" userEmail="test@test.com" orgName="Org" />)
    const buttons = screen.getAllByRole('button', { name: /terminar sessão/i })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('active nav link has aria-current="page"', () => {
    render(<Sidebar userName="Test User" userEmail="test@test.com" orgName="Org" />)
    const activeLink = screen.getByRole('link', { name: /dashboard/i })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
  })

  it('nav has accessible label', () => {
    render(<Sidebar userName="Test User" userEmail="test@test.com" orgName="Org" />)
    expect(screen.getByRole('navigation', { name: /navegação principal/i })).toBeInTheDocument()
  })

  it('Sidebar has no axe violations', async () => {
    const { container } = render(<Sidebar userName="Test User" userEmail="test@test.com" orgName="Org" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
