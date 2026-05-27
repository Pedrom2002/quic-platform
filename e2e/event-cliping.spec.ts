// Playwright e2e for Event Cliping feature.
// SKIPPED: Project does not have Playwright configured (no playwright.config.ts).
// When Playwright is added, remove the test.skip wrappers and set up auth fixtures.

import { test, expect } from '@playwright/test'

test.skip(true, 'Playwright not configured in this project')

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
