import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error('Falta DATABASE_URL. Exemplo:')
  console.error('  $env:DATABASE_URL="postgresql://postgres.zzxgumtzehfkxzqyjqjf:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"')
  console.error('  node scripts/run-migrations.mjs')
  process.exit(1)
}

const migrations = [
  '0001_initial_schema.sql',
  '0002_rls_policies.sql',
  '0003_seed_data.sql',
]

const { default: postgres } = await import('postgres').catch(() => {
  console.error('A instalar postgres...')
  return null
})

if (!postgres) {
  // install and retry
  const { execSync } = await import('child_process')
  execSync('npm install postgres', { stdio: 'inherit', cwd: join(__dir, '..') })
  const mod = await import('postgres')
  runAll(mod.default)
} else {
  runAll(postgres)
}

async function runAll(postgres) {
  const sql = postgres(DB_URL, { ssl: 'require', max: 1 })
  for (const file of migrations) {
    const path = join(__dir, '..', 'supabase', 'migrations', file)
    const content = readFileSync(path, 'utf8')
    console.log(`▶ A correr ${file}...`)
    try {
      await sql.unsafe(content)
      console.log(`✓ ${file}`)
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`)
      await sql.end()
      process.exit(1)
    }
  }
  console.log('\n✅ Todas as migrations aplicadas com sucesso!')
  await sql.end()
}
