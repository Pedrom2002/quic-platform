'use client'

import { useState, useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import { GroupsPanel } from './GroupsPanel'
import { ContactsList } from './ContactsList'
import { NewContactDialog } from './NewContactDialog'
import { EditContactDialog } from './EditContactDialog'
import { NewGroupDialog } from './NewGroupDialog'
import {
  loadContactsAction,
  loadGroupsAction,
  deactivateContactAction,
  type ContactGroup,
  type ContactWithGroups,
} from '@/app/dashboard/contacts/actions'

interface Props {
  initialContacts: ContactWithGroups[]
  initialGroups: ContactGroup[]
  isAdmin: boolean
}

export function ContactsLayout({ initialContacts, initialGroups, isAdmin }: Props) {
  const [contacts, setContacts] = useState(initialContacts)
  const [groups, setGroups] = useState(initialGroups)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<ContactWithGroups | null>(null)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [isPending, startTransition] = useTransition()

  const reloadContacts = useCallback(() => {
    startTransition(async () => {
      try {
        const [newContacts, newGroups] = await Promise.all([
          loadContactsAction(selectedGroupId),
          loadGroupsAction(),
        ])
        setContacts(newContacts)
        setGroups(newGroups)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar')
      }
    })
  }, [selectedGroupId])

  function handleSelectGroup(id: string | null) {
    setSelectedGroupId(id)
    startTransition(async () => {
      try {
        setContacts(await loadContactsAction(id))
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao filtrar')
      }
    })
  }

  function handleDeactivate(contactId: string) {
    if (!confirm('Desativar este contacto? Será removido do directório.')) return
    startTransition(async () => {
      try {
        await deactivateContactAction(contactId)
        toast.success('Contacto desativado')
        reloadContacts()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  const ungroupedCount = contacts.filter(c => c.groups.length === 0).length

  return (
    <div className="flex h-full">
      <GroupsPanel
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        totalCount={contacts.length}
        ungroupedCount={ungroupedCount}
        isAdmin={isAdmin}
        onNewGroup={() => setShowNewGroup(true)}
      />

      <ContactsList
        contacts={contacts}
        onNewContact={() => setShowNewContact(true)}
        onEdit={setEditingContact}
        onDeactivate={handleDeactivate}
        disabled={isPending}
      />

      <NewContactDialog
        open={showNewContact}
        onOpenChange={setShowNewContact}
        groups={groups}
        onCreated={reloadContacts}
      />

      <EditContactDialog
        contact={editingContact}
        groups={groups}
        onOpenChange={open => { if (!open) setEditingContact(null) }}
        onSaved={reloadContacts}
      />

      <NewGroupDialog
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        isAdmin={isAdmin}
        onCreated={reloadContacts}
      />
    </div>
  )
}
