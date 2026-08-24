import { defineConfig, configDefaults } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
    // Cópias locais de git worktrees também têm __tests__/ — nunca as correr
    exclude: [...configDefaults.exclude, '**/.worktrees/**', '**/.claude/**', 'mobile/**'],
    setupFiles: ['__tests__/setup.ts'],
    // A suite tem 1000+ testes; com o numero de workers por omissao (cpus-1),
    // alguns testes individualmente mais pesados (polling IMAP mockado, hooks
    // crypto, waitFor loops) competem por CPU e excedem o testTimeout de 5s
    // por pura contencao, nao por bug (confirmado: passam sempre isolados).
    // Limitar workers da mais CPU a cada teste em troca de tempo total maior.
    maxWorkers: 8,
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
      // are added, never lower. Backfill 2026-07: rotas ai/marketing e Server
      // Actions (stock, eventos, contactos, ficheiros, artistas) ganharam
      // testes de entry point; pisos subidos em conformidade.
      // schemas stay at the full bar.
      thresholds: {
        'lib/**/*.ts': { lines: 80, functions: 79, branches: 66, statements: 80 },
        'app/api/**/*.ts': { lines: 68, functions: 71, branches: 59, statements: 66 },
        'schemas/**/*.ts': { lines: 80, functions: 80, branches: 70, statements: 80 },
        'app/dashboard/**/actions.ts': { lines: 55, functions: 58, branches: 39, statements: 51 },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
