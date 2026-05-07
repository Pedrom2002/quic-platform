'use client'

import { Mail, Phone, Pencil, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ContactWithGroups } from '@/app/dashboard/contacts/actions'

const PRESET_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % PRESET_COLORS.length
  return PRESET_COLORS[idx]
}

interface Props {
  contact: ContactWithGroups
  onEdit: (contact: ContactWithGroups) => void
  onDeactivate: (contactId: string) => void
  disabled?: boolean
}

export function ContactCard({ contact, onEdit, onDeactivate, disabled }: Props) {
  const color = getAvatarColor(contact.full_name)

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
        style={{ backgroundColor: color + '18', color }}
      >
        {getInitials(contact.full_name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-slate-800 font-medium">{contact.full_name}</p>
        <div className="flex items-center gap-4 mt-0.5">
          {contact.email && (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <Mail className="w-3 h-3" />{contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <Phone className="w-3 h-3" />{contact.phone}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {contact.groups.map(g => (
          <span
            key={g.id}
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: (g.color ?? '#6366f1') + '18',
              color: g.color ?? '#6366f1',
            }}
          >
            {g.name}
          </span>
        ))}
        {contact.groups.length === 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-400">
            Sem grupo
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="sm" variant="ghost" onClick={() => onEdit(contact)} disabled={disabled}
          className="text-slate-400 hover:text-slate-700 h-8 w-8 p-0">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDeactivate(contact.id)} disabled={disabled}
          className="text-slate-300 hover:text-red-500 h-8 w-8 p-0">
          <UserMinus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
