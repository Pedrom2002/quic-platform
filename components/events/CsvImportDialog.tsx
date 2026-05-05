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
