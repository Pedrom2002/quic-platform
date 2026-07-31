import { createClient } from '@/lib/supabase/server'
import { createList } from './actions'
import { CsvUpload } from '@/components/marketing/CsvUpload'
import { ListContacts } from '@/components/marketing/ListContacts'

export default async function MarketingContactsPage() {
  const supabase = await createClient()
  const { data: lists } = await supabase
    .from('marketing_lists')
    .select('id, name, contact_count, created_at')
    .order('created_at', { ascending: false })

  type ContactRow = {
    id: string
    list_id: string
    email: string
    name: string | null
    company: string | null
    role: string | null
    status: string
    engagement_score: number
  }

  const listIds = (lists ?? []).map(l => l.id)
  let allContacts: ContactRow[] = []
  if (listIds.length) {
    const { data } = await supabase
      .from('marketing_contacts')
      .select('id, list_id, email, name, company, role, status, engagement_score')
      .in('list_id', listIds)
      .order('created_at', { ascending: false })
    allContacts = (data ?? []) as ContactRow[]
  }

  const contactsByList = new Map<string, ContactRow[]>()
  for (const c of allContacts) {
    const arr = contactsByList.get(c.list_id) ?? []
    arr.push(c)
    contactsByList.set(c.list_id, arr)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Listas de Contactos</h1>
        <form action={createList} className="flex gap-2">
          <input name="name" placeholder="Nome da lista" required
            className="border rounded px-3 py-2 text-sm" />
          <button type="submit"
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-zinc-700">
            Nova Lista
          </button>
        </form>
      </div>
      <div className="space-y-6">
        {lists?.map(list => (
          <div key={list.id} className="border rounded-lg p-5 space-y-4">
            <div>
              <p className="font-medium text-lg">{list.name}</p>
            </div>
            <ListContacts listId={list.id} contacts={contactsByList.get(list.id) ?? []} />
            <details className="border-t pt-3">
              <summary className="text-sm text-zinc-600 cursor-pointer hover:text-zinc-900">
                Importar em massa (CSV / Excel)
              </summary>
              <div className="pt-3">
                <CsvUpload listId={list.id} />
              </div>
            </details>
          </div>
        ))}
        {!lists?.length && (
          <p className="text-sm text-zinc-400">Nenhuma lista criada ainda.</p>
        )}
      </div>
    </div>
  )
}
