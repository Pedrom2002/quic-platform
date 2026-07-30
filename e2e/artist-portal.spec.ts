// Playwright e2e for the artist portal.
// Runs against an isolated [E2E TEST] org/artist seeded in production (see
// .env.e2e.local, gitignored). Skips only when the token isn't configured.

import { test, expect } from '@playwright/test'

const PORTAL_TOKEN = process.env.E2E_ARTIST_PORTAL_TOKEN

test.skip(!PORTAL_TOKEN, 'E2E_ARTIST_PORTAL_TOKEN not set — see .env.e2e.local.example')

test('portal with a valid token shows the four tabs and their content', async ({ page }) => {
  await page.goto(`/artista/${PORTAL_TOKEN}`)

  // Tabs are buttons, only rendered when the section has data — the seeded
  // [E2E TEST] artist has one item in each of agenda/clipping/content/document.
  await expect(page.getByRole('button', { name: 'Agenda' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Imprensa' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conteúdos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Documentos' })).toBeVisible()

  // Agenda tab is active by default and shows the seeded upcoming item.
  await expect(page.getByText('[E2E TEST] Concerto').first()).toBeVisible()

  await page.getByRole('button', { name: 'Imprensa' }).click()
  await expect(page.getByText('[E2E TEST] Artigo').first()).toBeVisible()

  await page.getByRole('button', { name: 'Conteúdos' }).click()
  await expect(page.getByText('[E2E TEST] Foto').first()).toBeVisible()

  await page.getByRole('button', { name: 'Documentos' }).click()
  await expect(page.getByText('[E2E TEST] Rider Técnico').first()).toBeVisible()
})

test('invalid token shows the neutral expired page', async ({ page }) => {
  await page.goto('/artista/token-invalido-xyz')
  await expect(page.getByRole('heading', { name: 'Acesso expirado' })).toBeVisible()
})
