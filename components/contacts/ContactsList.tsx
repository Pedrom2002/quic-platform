'use client'

import { useState } from 'react'
import { Search, Plus, Users } from 'lucide-react'
import { ContactCard } from './ContactCard'
import type { ContactWithGroups } from '@/app/dashboard/contacts/actions'

interface Props {
  contacts: ContactWithGroups[]
  onNewContact: () => void
  onEdit: (contact: ContactWithGroups) => void
  onDeactivate: (contactId: string) => void
  disabled?: boolean
}

export function ContactsList({ contacts, onNewContact, onEdit, onDeactivate, disabled }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? contacts.filter(c => {
        const q = search.toLowerCase()
        return (
          c.full_name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
        )
      })
    : contacts

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-100 mr-auto">Contactos</h1>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-500 w-52">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="bg-transparent outline-none w-full text-zinc-300 placeholder:text-zinc-600"
          />
        </div>
        <button
          onClick={onNewContact}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo contacto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-600 text-sm gap-1">
            <Users className="w-8 h-8 mb-1 opacity-40" />
            {search ? 'Nenhum resultado para a pesquisa.' : 'Nenhum contacto neste grupo.'}
          </div>
        ) : (
          filtered.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  )
}
