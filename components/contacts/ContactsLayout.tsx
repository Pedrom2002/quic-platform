'use client'

import { useState, useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import { GroupsPanel } from './GroupsPanel'
import { ContactsList } from './ContactsList'
import { NewContactDialog } from './NewContactDialog'
import { EditContactDialog } from './EditContactDialog'
import { NewGroupDialog } from './NewGroupDialog'
import {
  loadContactsPageAction,
  loadGroupsAction,
  loadGroupCountsAction,
  deactivateContactAction,
  type ContactGroup,
  type ContactWithGroups,
  type GroupCounts,
} from '@/app/dashboard/contacts/actions'

type Cursor = { name: string; id: string } | null

interface Props {
  initialContacts: ContactWithGroups[]
  initialCursor: Cursor
  initialGroups: ContactGroup[]
  initialCounts: GroupCounts
  isAdmin: boolean
}

export function ContactsLayout({ initialContacts, initialCursor, initialGroups, initialCounts, isAdmin }: Props) {
  const [contacts, setContacts] = useState(initialContacts)
  const [cursor, setCursor] = useState<Cursor>(initialCursor)
  const [groups, setGroups] = useState(initialGroups)
  const [counts, setCounts] = useState(initialCounts)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<ContactWithGroups | null>(null)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const reloadContacts = useCallback(() => {
    startTransition(async () => {
      try {
        const [page, newGroups, newCounts] = await Promise.all([
          loadContactsPageAction(selectedGroupId),
          loadGroupsAction(),
          loadGroupCountsAction(),
        ])
        setContacts(page.contacts)
        setCursor(page.nextCursor)
        setGroups(newGroups)
        setCounts(newCounts)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar')
      }
    })
  }, [selectedGroupId])

  function handleSelectGroup(id: string | null) {
    setSelectedGroupId(id)
    startTransition(async () => {
      try {
        const page = await loadContactsPageAction(id)
        setContacts(page.contacts)
        setCursor(page.nextCursor)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao filtrar')
      }
    })
  }

  const handleLoadMore = useCallback(() => {
    if (!cursor || isLoadingMore) return
    setIsLoadingMore(true)
    loadContactsPageAction(selectedGroupId, cursor)
      .then(page => {
        setContacts(prev => prev.concat(page.contacts))
        setCursor(page.nextCursor)
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar mais contactos')
      })
      .finally(() => setIsLoadingMore(false))
  }, [cursor, isLoadingMore, selectedGroupId])

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

  return (
    <div className="flex h-full">
      <GroupsPanel
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        totalCount={counts.total}
        ungroupedCount={counts.ungrouped}
        countsByGroup={counts.byGroup}
        isAdmin={isAdmin}
        onNewGroup={() => setShowNewGroup(true)}
      />

      <ContactsList
        contacts={contacts}
        onNewContact={() => setShowNewContact(true)}
        onEdit={setEditingContact}
        onDeactivate={handleDeactivate}
        disabled={isPending}
        hasMore={cursor !== null}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
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
