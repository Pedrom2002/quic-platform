import { createClient } from '@/lib/supabase/server'
import { createList } from './actions'
import { CsvUpload } from '@/components/marketing/CsvUpload'

export default async function MarketingContactsPage() {
  const supabase = await createClient()
  const { data: lists } = await supabase
    .from('marketing_lists')
    .select('id, name, contact_count, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Listas de Contactos</h1>
        <form action={createList} className="flex gap-2">
          <input name="name" placeholder="Nome da lista" required
            className="border rounded px-3 py-2 text-sm" />
          <button type="submit"
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-zinc-700">
            Nova Lista
          </button>
        </form>
      </div>
      <div className="space-y-4">
        {lists?.map(list => (
          <div key={list.id} className="border rounded-lg p-4">
            <div className="mb-3">
              <p className="font-medium">{list.name}</p>
              <p className="text-sm text-zinc-500">{list.contact_count} contactos</p>
            </div>
            <CsvUpload listId={list.id} onImported={() => {}} />
          </div>
        ))}
        {!lists?.length && (
          <p className="text-sm text-zinc-400">Nenhuma lista criada ainda.</p>
        )}
      </div>
    </div>
  )
}
