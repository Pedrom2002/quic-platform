import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'
import { redirect } from 'next/navigation'
import { ContactsLayout } from '@/components/contacts/ContactsLayout'
import { loadContactsAction, loadGroupsAction } from './actions'

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) redirect('/auth/login')

  const isAdmin = member.role === 'admin'

  const [contacts, groups] = await Promise.all([
    loadContactsAction(null),
    loadGroupsAction(),
  ])

  return (
    <div className="h-full flex flex-col">
      <ContactsLayout
        initialContacts={contacts}
        initialGroups={groups}
        isAdmin={isAdmin}
      />
    </div>
  )
}
