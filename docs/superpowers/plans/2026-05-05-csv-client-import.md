# CSV Client Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar até 50 clientes de uma vez via CSV na página de clientes do evento.

**Architecture:** Parse CSV no browser (FileReader + split), preview em tabela com validação linha a linha, confirmação chama `createAndAddClientAction` em sequência para cada linha válida. Sem novas dependências.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Shadcn Dialog/Table

---

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `lib/csv-import.ts` | Criar — parse + validação CSV |
| `components/events/CsvImportDialog.tsx` | Criar — Dialog com upload, preview, confirmação |
| `app/dashboard/events/[eventId]/clients/page.tsx` | Modificar — botão + integração |

---

### Task 1: Parser CSV em `lib/csv-import.ts`

**Files:**
- Create: `lib/csv-import.ts`
- Test: `__tests__/csv-import.test.ts`

- [ ] **Step 1: Escrever teste falhante**

```typescript
// __tests__/csv-import.test.ts
import { describe, it, expect } from 'vitest'
import { parseCsvClients } from '@/lib/csv-import'

describe('parseCsvClients', () => {
  it('parses valid CSV', () => {
    const csv = 'nome,email,telefone,empresa\nJoão Silva,joao@exemplo.pt,+351912345678,Empresa Lda'
    const result = parseCsvClients(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      full_name: 'João Silva',
      email: 'joao@exemplo.pt',
      phone: '+351912345678',
      company: 'Empresa Lda',
      error: null,
    })
  })

  it('marks empty name as error', () => {
    const csv = 'nome,email\n,joao@exemplo.pt'
    const result = parseCsvClients(csv)
    expect(result.rows[0].error).toBe('Nome obrigatório')
  })

  it('marks invalid email as error', () => {
    const csv = 'nome,email\nJoão,not-an-email'
    const result = parseCsvClients(csv)
    expect(result.rows[0].error).toBe('Email inválido')
  })

  it('accepts english column names', () => {
    const csv = 'name,email,phone,company\nJoão,,,'
    const result = parseCsvClients(csv)
    expect(result.rows[0].full_name).toBe('João')
    expect(result.rows[0].error).toBeNull()
  })

  it('returns global error when over 50 rows', () => {
    const rows = Array.from({ length: 51 }, (_, i) => `Nome ${i},email${i}@x.pt,,`).join('\n')
    const csv = `nome,email,telefone,empresa\n${rows}`
    const result = parseCsvClients(csv)
    expect(result.globalError).toMatch(/50/)
  })

  it('returns global error when nome column missing', () => {
    const csv = 'email,telefone\njoao@x.pt,123'
    const result = parseCsvClients(csv)
    expect(result.globalError).toMatch(/nome/i)
  })
})
```

- [ ] **Step 2: Correr teste para confirmar que falha**

```bash
npx vitest run __tests__/csv-import.test.ts
```

Expected: FAIL com "Cannot find module '@/lib/csv-import'"

- [ ] **Step 3: Implementar `lib/csv-import.ts`**

```typescript
export interface CsvClientRow {
  full_name: string
  email: string
  phone: string
  company: string
  error: string | null
}

export interface CsvParseResult {
  rows: CsvClientRow[]
  globalError: string | null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const NAME_COLS = ['nome', 'name']
const EMAIL_COLS = ['email', 'e-mail']
const PHONE_COLS = ['telefone', 'phone', 'tel']
const COMPANY_COLS = ['empresa', 'company', 'companhia']

function findCol(headers: string[], candidates: string[]): number {
  return headers.findIndex(h => candidates.includes(h.toLowerCase().trim()))
}

export function parseCsvClients(csv: string): CsvParseResult {
  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { rows: [], globalError: 'CSV sem dados' }

  const headers = lines[0].split(',')
  const nameIdx = findCol(headers, NAME_COLS)

  if (nameIdx === -1) {
    return { rows: [], globalError: 'Coluna "nome" não encontrada. Cabeçalho esperado: nome,email,telefone,empresa' }
  }

  const emailIdx = findCol(headers, EMAIL_COLS)
  const phoneIdx = findCol(headers, PHONE_COLS)
  const companyIdx = findCol(headers, COMPANY_COLS)

  const dataLines = lines.slice(1)
  if (dataLines.length > 50) {
    return { rows: [], globalError: `Máximo 50 clientes por importação. Este ficheiro tem ${dataLines.length} linhas.` }
  }

  const rows: CsvClientRow[] = dataLines.map(line => {
    const cols = line.split(',')
    const full_name = (cols[nameIdx] ?? '').trim()
    const email = emailIdx >= 0 ? (cols[emailIdx] ?? '').trim() : ''
    const phone = phoneIdx >= 0 ? (cols[phoneIdx] ?? '').trim() : ''
    const company = companyIdx >= 0 ? (cols[companyIdx] ?? '').trim() : ''

    let error: string | null = null
    if (!full_name) error = 'Nome obrigatório'
    else if (email && !isValidEmail(email)) error = 'Email inválido'

    return { full_name, email, phone, company, error }
  })

  return { rows, globalError: null }
}
```

- [ ] **Step 4: Correr teste para confirmar que passa**

```bash
npx vitest run __tests__/csv-import.test.ts
```

Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add lib/csv-import.ts __tests__/csv-import.test.ts
git commit -m "feat: CSV client parser with validation"
```

---

### Task 2: Dialog `CsvImportDialog`

**Files:**
- Create: `components/events/CsvImportDialog.tsx`

- [ ] **Step 1: Criar `components/events/CsvImportDialog.tsx`**

```typescript
'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { parseCsvClients } from '@/lib/csv-import'
import type { CsvClientRow } from '@/lib/csv-import'
import { createAndAddClientAction } from '@/app/dashboard/events/[eventId]/clients/actions'

interface CsvImportDialogProps {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

export function CsvImportDialog({ eventId, open, onOpenChange, onImported }: CsvImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CsvClientRow[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      const result = parseCsvClients(csv)
      setGlobalError(result.globalError)
      setRows(result.rows)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  const validRows = rows.filter(r => !r.error)
  const errorRows = rows.filter(r => r.error)

  function handleImport() {
    if (!validRows.length) return
    startTransition(async () => {
      let imported = 0
      for (const row of validRows) {
        try {
          await createAndAddClientAction(eventId, {
            full_name: row.full_name,
            email: row.email,
            phone: row.phone,
            company: row.company,
          }, 'primary_contact')
          imported++
          setProgress(`${imported} de ${validRows.length} importados...`)
        } catch {
          // skip failed rows silently, count shown in summary
        }
      }
      const skipped = validRows.length - imported
      toast.success(`${imported} clientes importados${skipped > 0 ? `, ${skipped} falharam` : ''}`)
      onImported()
      onOpenChange(false)
      setRows([])
      setProgress(null)
    })
  }

  function handleClose() {
    if (isPending) return
    setRows([])
    setGlobalError(null)
    setProgress(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Importar Clientes via CSV</DialogTitle>
        </DialogHeader>

        {!rows.length && !globalError && (
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-slate-300 transition-colors mt-2"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Clique ou arraste um ficheiro .csv</p>
            <p className="text-xs text-slate-400 mt-1">Cabeçalho esperado: nome, email, telefone, empresa</p>
            <input ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        )}

        {globalError && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl mt-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-slate-500">{rows.length} linhas encontradas</span>
              {validRows.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="w-3 h-3" />{validRows.length} válidas
                </span>
              )}
              {errorRows.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <X className="w-3 h-3" />{errorRows.length} com erro (serão ignoradas)
                </span>
              )}
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-100 rounded-xl mt-2">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {['Nome', 'Email', 'Telefone', 'Empresa', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, idx) => (
                    <tr key={idx} className={row.error ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 text-slate-800">{row.full_name || <span className="text-red-400">—</span>}</td>
                      <td className="px-3 py-2 text-slate-500">{row.email || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.phone || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.company || '—'}</td>
                      <td className="px-3 py-2">
                        {row.error && <span className="text-red-500">{row.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {progress && (
              <p className="text-sm text-slate-500 mt-2">{progress}</p>
            )}

            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={handleClose} disabled={isPending} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={isPending || !validRows.length} className="flex-1">
                {isPending ? 'A importar...' : `Importar ${validRows.length} cliente${validRows.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/events/CsvImportDialog.tsx
git commit -m "feat: CsvImportDialog component"
```

---

### Task 3: Integrar botão na página de clientes do evento

**Files:**
- Modify: `app/dashboard/events/[eventId]/clients/page.tsx`

- [ ] **Step 1: Adicionar import e estado no topo do componente**

No topo do ficheiro `app/dashboard/events/[eventId]/clients/page.tsx`, adicionar import:

```typescript
import { CsvImportDialog } from '@/components/events/CsvImportDialog'
```

Dentro da função `EventClientsPage`, adicionar estado após os estados existentes:

```typescript
  const [csvOpen, setCsvOpen] = useState(false)
```

- [ ] **Step 2: Adicionar botão e dialog no JSX**

No bloco `<div className="flex gap-2">` que contém os botões, adicionar antes do botão "Novo Cliente":

```tsx
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Importar CSV
          </Button>
          <CsvImportDialog
            eventId={eventId}
            open={csvOpen}
            onOpenChange={setCsvOpen}
            onImported={loadData}
          />
```

Adicionar `Upload` ao import do lucide-react existente:

```typescript
import { Plus, Mail, Phone, Trash2, UserCircle, Globe, Upload } from 'lucide-react'
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros

- [ ] **Step 4: Commit e push**

```bash
git add app/dashboard/events/[eventId]/clients/page.tsx
git commit -m "feat: CSV import button on event clients page"
git push origin master
```
