import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/**/*.ts',
        'app/api/**/*.ts',
        'schemas/**/*.ts',
        'app/dashboard/**/actions.ts',
      ],
      reporter: ['text', 'lcov', 'html'],
      // Per-area *ratchet* thresholds = current measured floor; raise as tests
      // are added, never lower. lib/** and app/api/** sit below 80% because the
      // merged deliverability suite (marketing warmup/replies/forensics/DNS)
      // landed with limited unit tests — a tracked gap to backfill toward 80%.
      // schemas stay at the full bar; dashboard Server Actions are being filled in.
      thresholds: {
        'lib/**/*.ts': { lines: 78, functions: 76, branches: 64, statements: 78 },
        'app/api/**/*.ts': { lines: 77, functions: 73, branches: 68, statements: 75 },
        'schemas/**/*.ts': { lines: 80, functions: 80, branches: 70, statements: 80 },
        'app/dashboard/**/actions.ts': { lines: 20, functions: 22, branches: 15, statements: 20 },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
