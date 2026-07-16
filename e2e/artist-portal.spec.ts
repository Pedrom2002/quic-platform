// Playwright e2e for the artist portal.
// SKIPPED by default like the rest of the e2e suite: run with a live stack
// (E2E_BASE_URL + seeded data) and remove the skip wrapper.

import { test, expect } from '@playwright/test'

const PORTAL_TOKEN = process.env.E2E_ARTIST_PORTAL_TOKEN

test.skip(!process.env.E2E_BASE_URL || !PORTAL_TOKEN, 'E2E_BASE_URL / E2E_ARTIST_PORTAL_TOKEN not set')

test('portal with a valid token shows the four sections', async ({ page }) => {
  await page.goto(`/artista/${PORTAL_TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Imprensa' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Conteúdos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Documentos' })).toBeVisible()
})

test('invalid token shows the neutral expired page', async ({ page }) => {
  await page.goto('/artista/token-invalido-xyz')
  await expect(page.getByRole('heading', { name: 'Acesso expirado' })).toBeVisible()
})

test('tenant isolation: dashboard artists list only shows own organization', async () => {
  // 1. Sign in as org A member, create artist
  // 2. Sign in as org B member - assert artist from org A not visible in /dashboard/artists
  // 3. Direct navigation to org A artist detail URL returns 404
  test.skip(true, 'Requires two seeded organizations with auth fixtures')
})
