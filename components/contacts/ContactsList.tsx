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
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contactos</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {contacts.length} {contacts.length === 1 ? 'contacto' : 'contactos'} no directório
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="bg-transparent outline-none w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={onNewContact}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo contacto
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {search ? 'Nenhum resultado para a pesquisa.' : 'Nenhum contacto neste grupo.'}
            </p>
            {!search && (
              <button
                onClick={onNewContact}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-1"
              >
                Criar primeiro contacto
              </button>
            )}
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
