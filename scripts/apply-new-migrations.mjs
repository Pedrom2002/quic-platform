// Aplica as migrations 0027–0029 (isolamento de tenant do marketing + claim
// atómico de notification_jobs). São escritas de forma idempotente
// (IF EXISTS / IF NOT EXISTS / CREATE OR REPLACE), por isso é seguro re-correr.
//
// Uso:
//   DATABASE_URL="postgresql://postgres.<ref>:[PASSWORD]@<host>:5432/postgres" \
//     node scripts/apply-new-migrations.mjs
//
// O DATABASE_URL é a connection string do Supabase (Project Settings → Database).
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error('Falta DATABASE_URL.')
  console.error('  DATABASE_URL="postgresql://postgres.<ref>:[PASSWORD]@<host>:5432/postgres" \\')
  console.error('    node scripts/apply-new-migrations.mjs')
  process.exit(1)
}

const migrations = [
  '0027_marketing_rls_org_scope.sql',
  '0028_marketing_organization_id.sql',
  '0029_notification_jobs_atomic_claim.sql',
]

const { default: postgres } = await import('postgres')

const sql = postgres(DB_URL, { ssl: 'require', max: 1 })

for (const file of migrations) {
  const content = readFileSync(join(__dir, '..', 'supabase', 'migrations', file), 'utf8')
  process.stdout.write(`▶ ${file} ... `)
  try {
    // Cada migration corre numa transação — falha → rollback completo dessa migration.
    await sql.begin(tx => tx.unsafe(content))
    console.log('✓')
  } catch (err) {
    console.log('✗')
    console.error(`  ${err.message}`)
    await sql.end()
    process.exit(1)
  }
}

console.log('\n✅ Migrations 0027–0029 aplicadas com sucesso.')
await sql.end()
