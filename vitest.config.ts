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
      // Strict bar for mature core code; Server Actions are measured with a
      // lower *ratchet* threshold — they are a known coverage gap being filled
      // incrementally (raise these numbers as tests are added; never lower).
      thresholds: {
        'lib/**/*.ts': { lines: 80, functions: 80, branches: 70, statements: 80 },
        'app/api/**/*.ts': { lines: 80, functions: 80, branches: 70, statements: 80 },
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
