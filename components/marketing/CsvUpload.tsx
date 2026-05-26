'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface Props {
  listId: string
  onImported: (count: number) => void
}

export function CsvUpload({ listId, onImported }: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setHeaders(results.meta.fields ?? [])
          setRows(results.data)
        },
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
      setHeaders(Object.keys(data[0] ?? {}))
      setRows(data)
    }
  }

  async function handleImport() {
    setLoading(true)
    const contacts = rows
      .map(row => ({
        list_id: listId,
        email: row[mapping.email] ?? '',
        name: mapping.name ? row[mapping.name] : undefined,
        company: mapping.company ? row[mapping.company] : undefined,
        role: mapping.role ? row[mapping.role] : undefined,
      }))
      .filter(r => r.email.includes('@'))

    const res = await fetch('/api/marketing/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    })

    if (res.ok) {
      onImported(contacts.length)
      setRows([])
      setHeaders([])
      setMapping({})
    }
    setLoading(false)
  }

  const FIELD_LABELS: Record<string, string> = { email: 'Email *', name: 'Nome', company: 'Empresa', role: 'Cargo' }

  return (
    <div className="space-y-3">
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="text-sm" />
      {headers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Mapear colunas:</p>
          {Object.entries(FIELD_LABELS).map(([field, label]) => (
            <div key={field} className="flex items-center gap-3">
              <span className="text-sm w-24 shrink-0">{label}</span>
              <select value={mapping[field] ?? ''} onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                className="border rounded px-2 py-1 text-sm">
                <option value="">— ignorar —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
          <p className="text-xs text-zinc-500">{rows.length} contactos encontrados</p>
          <button onClick={handleImport} disabled={!mapping.email || loading}
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-zinc-700 disabled:opacity-50">
            {loading ? 'A importar...' : `Importar ${rows.length} contactos`}
          </button>
        </div>
      )}
    </div>
  )
}
