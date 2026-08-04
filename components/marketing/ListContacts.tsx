'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { addContact, deleteContact } from '@/app/dashboard/marketing/contacts/actions'
import { Trash2, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Contact = {
  id: string
  email: string
  name: string | null
  company: string | null
  role: string | null
  status: string
  engagement_score: number
}

type State = { ok: boolean; message: string } | null

export function ListContacts({ listId, contacts }: { listId: string; contacts: Contact[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<State, FormData>(addContact, null)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')

  const PAGE_SIZE = 25
  const filtered = query.trim()
    ? contacts.filter(c => {
        const q = query.toLowerCase()
        return c.email.toLowerCase().includes(q) ||
               (c.name?.toLowerCase().includes(q) ?? false) ||
               (c.company?.toLowerCase().includes(q) ?? false)
      })
    : contacts

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{contacts.length} contactos</p>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900"
        >
          <Plus className="w-4 h-4" />
          Adicionar manualmente
        </button>
      </div>

      {open && (
        <form action={formAction} className="border rounded-lg p-3 bg-zinc-50 space-y-2"
          onSubmit={() => setTimeout(() => (document.getElementById(`add-form-${listId}`) as HTMLFormElement)?.reset(), 100)}
          id={`add-form-${listId}`}
        >
          <input type="hidden" name="list_id" value={listId} />
          <div className="grid grid-cols-2 gap-2">
            <input name="email" type="email" placeholder="email@example.com *" required
              className="border rounded px-2 py-1.5 text-sm" />
            <input name="name" placeholder="Nome"
              className="border rounded px-2 py-1.5 text-sm" />
            <input name="company" placeholder="Empresa"
              className="border rounded px-2 py-1.5 text-sm" />
            <input name="role" placeholder="Cargo"
              className="border rounded px-2 py-1.5 text-sm" />
          </div>
          {state && (
            <p className={`text-xs ${state.ok ? 'text-green-600' : 'text-red-600'}`}>
              {state.message}
            </p>
          )}
          <button type="submit" disabled={pending}
            className="bg-zinc-900 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-zinc-700 disabled:opacity-50">
            {pending ? 'A adicionar...' : 'Adicionar'}
          </button>
        </form>
      )}

      {contacts.length > 0 && (
        <>
          {contacts.length > 10 && (
            <input
              type="text"
              placeholder="Pesquisar email, nome ou empresa..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(0) }}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          )}
          <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 text-xs text-zinc-500 uppercase">
              <TableRow>
                <TableHead className="px-3 py-2 h-auto">Email</TableHead>
                <TableHead className="px-3 py-2 h-auto">Nome</TableHead>
                <TableHead className="px-3 py-2 h-auto">Empresa</TableHead>
                <TableHead className="px-3 py-2 h-auto">Status</TableHead>
                <TableHead className="px-3 py-2 h-auto">Score</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="px-3 py-2">{c.email}</TableCell>
                  <TableCell className="px-3 py-2">{c.name ?? '—'}</TableCell>
                  <TableCell className="px-3 py-2">{c.company ?? '—'}</TableCell>
                  <TableCell className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      c.status === 'active' ? 'bg-green-100 text-green-700' :
                      c.status === 'bounced' ? 'bg-red-100 text-red-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {c.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">{c.engagement_score}</TableCell>
                  <TableCell className="px-3 py-2">
                    <button
                      onClick={async () => {
                        if (confirm(`Eliminar ${c.email}?`)) await deleteContact(c.id)
                      }}
                      className="text-zinc-400 hover:text-red-600"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-2 py-1 text-xs rounded border bg-white disabled:opacity-40">Anterior</button>
                <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
                  className="px-2 py-1 text-xs rounded border bg-white disabled:opacity-40">Seguinte</button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  )
}
