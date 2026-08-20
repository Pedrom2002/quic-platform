import { createClient } from '@/lib/supabase/server'
import { createList } from './actions'
import { CsvUpload } from '@/components/marketing/CsvUpload'
import { ListContacts } from '@/components/marketing/ListContacts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Cap por lista: esta pagina carrega TODAS as listas de uma vez (cada uma
// com a sua propria paginacao/pesquisa client-side dentro de ListContacts),
// por isso o limite tem de ser por lista, nao um limite global, senao listas
// no fim da ordenacao ficariam sem contactos nenhuns quando o total geral
// crescesse. Mostra-se os mais recentes; contact_count (mantido por trigger)
// indica quando ha mais contactos do que os carregados.
const CONTACTS_PER_LIST_LIMIT = 500

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
  const contactsByList = new Map<string, ContactRow[]>()
  if (listIds.length) {
    const results = await Promise.all(
      listIds.map(listId =>
        supabase
          .from('marketing_contacts')
          .select('id, list_id, email, name, company, role, status, engagement_score')
          .eq('list_id', listId)
          .order('created_at', { ascending: false })
          .limit(CONTACTS_PER_LIST_LIMIT)
      )
    )
    results.forEach((result, i) => {
      contactsByList.set(listIds[i], (result.data ?? []) as ContactRow[])
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Listas de Contactos</h1>
        <form action={createList} className="flex gap-2">
          <Input name="name" placeholder="Nome da lista" required className="w-auto" />
          <Button type="submit">
            Nova Lista
          </Button>
        </form>
      </div>
      <div className="space-y-6">
        {lists?.map(list => (
          <div key={list.id} className="border rounded-lg p-5 space-y-4">
            <div>
              <p className="font-medium text-lg">{list.name}</p>
            </div>
            <ListContacts listId={list.id} contacts={contactsByList.get(list.id) ?? []} />
            {list.contact_count > CONTACTS_PER_LIST_LIMIT && (
              <p className="text-xs text-amber-600">
                A mostrar os {CONTACTS_PER_LIST_LIMIT} contactos mais recentes de {list.contact_count}. Usa a pesquisa para encontrar os restantes.
              </p>
            )}
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
