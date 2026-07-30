// Playwright e2e for Event Cliping feature.
// SKIPPED: needs a dashboard-login auth fixture (storageState), which e2e/
// artist-portal.spec.ts didn't require since the artist portal is public.
// Playwright itself IS configured (see playwright.config.ts) and running —
// see artist-portal.spec.ts for a working example against seeded [E2E TEST]
// data. To unskip this spec: sign in with E2E_TEST_EMAIL/E2E_TEST_PASSWORD
// via /auth/login in a Playwright fixture, save storageState, and reuse it
// here. The seeded [E2E TEST] event id is in .env.e2e.local as
// E2E_EVENT_PORTAL_TOKEN's associated event.

import { test, expect } from '@playwright/test'

test.skip(true, 'Needs a dashboard-login auth fixture — see comment above')

test('add article and verify notification job created', async ({ page }) => {
  // 1. Navigate to an event's Cliping tab
  // 2. Assert "Cliping" heading visible
  // 3. Click "Adicionar artigo"
  // 4. Fill: title, url, source
  // 5. Submit - assert "Artigo adicionado" in success message
  // 6. Assert article row appears in list
  // 7. Navigate to /notifications - assert row with "Artigo: <title>"
})

test('delete article removes it from list', async ({ page }) => {
  // 1. Navigate to Cliping tab with at least one article
  // 2. Click delete button - confirm dialog
  // 3. Assert article row gone
})
