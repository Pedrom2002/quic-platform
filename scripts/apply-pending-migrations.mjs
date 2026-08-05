// Aplica automaticamente as migrations pendentes em supabase/migrations/ via
// `supabase db query --linked -f`, NUNCA `supabase db push` (histórico de
// migrations partilhado com o Stock-Plat, ver comentário em cada .sql desde
// 0040 - db push corromperia esse histórico).
//
// Mantém um marcador local (.supabase-applied-migrations, gitignored) com o
// nome do último ficheiro aplicado por este script; qualquer migration com
// nome (ordenação alfabética/numérica) posterior a esse marcador é "pendente".
//
// Requer: `supabase login` já feito (CLI autenticado) e projeto linkado
// (supabase/.temp/project-ref já existe neste repo).
//
// Uso:
//   node scripts/apply-pending-migrations.mjs           # aplica tudo o que falta
//   node scripts/apply-pending-migrations.mjs --dry-run  # só lista o que falta
//   node scripts/apply-pending-migrations.mjs --from 0040_x.sql  # ignora o marcador, começa daqui

import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')
const MARKER_FILE = join(ROOT, '.supabase-applied-migrations')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fromIdx = args.indexOf('--from')
const fromOverride = fromIdx !== -1 ? args[fromIdx + 1] : null

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{4}_.+\.sql$/.test(f))
    .sort()
}

function readMarker() {
  if (!existsSync(MARKER_FILE)) return null
  return readFileSync(MARKER_FILE, 'utf8').trim() || null
}

function writeMarker(filename) {
  writeFileSync(MARKER_FILE, filename + '\n', 'utf8')
}

function pendingMigrations(all, lastApplied) {
  if (!lastApplied) return all
  const idx = all.indexOf(lastApplied)
  // Marcador desconhecido (ficheiro renumerado/apagado): não adivinha, força --from explícito.
  if (idx === -1) {
    console.error(`Marcador "${lastApplied}" (${MARKER_FILE}) não corresponde a nenhum ficheiro em supabase/migrations/.`)
    console.error('Corrige o marcador manualmente ou usa --from <ficheiro> para forçar o ponto de partida.')
    process.exit(1)
  }
  return all.slice(idx + 1)
}

function applyOne(filename) {
  const path = join(MIGRATIONS_DIR, filename)
  process.stdout.write(`▶ ${filename} ... `)
  try {
    execFileSync('supabase', ['db', 'query', '--linked', '-f', path], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    console.log('✓')
    return true
  } catch (err) {
    console.log('✗')
    const output = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '')
    console.error(output || err.message)
    return false
  }
}

const all = listMigrationFiles()
const lastApplied = fromOverride ?? readMarker()
const pending = pendingMigrations(all, lastApplied)

if (pending.length === 0) {
  console.log('Nenhuma migration pendente.')
  process.exit(0)
}

console.log(`${pending.length} migration(ões) pendente(s):`)
for (const f of pending) console.log(`  - ${f}`)

if (dryRun) {
  console.log('\n(--dry-run: nada foi aplicado)')
  process.exit(0)
}

console.log('')
for (const filename of pending) {
  const ok = applyOne(filename)
  if (!ok) {
    console.error(`\nParado em ${filename}. Corrige o erro e volta a correr (o marcador ainda aponta para a última migration aplicada com sucesso).`)
    process.exit(1)
  }
  writeMarker(filename)
}

console.log(`\n✅ ${pending.length} migration(ões) aplicada(s) com sucesso.`)
