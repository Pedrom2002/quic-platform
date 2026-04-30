import { createClient } from '@/lib/supabase/server'
import { Mail, Phone, Building2 } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-500 mt-1">{clients?.length ?? 0} contactos no directório</p>
      </div>

      {!clients?.length ? (
        <div className="text-center py-20">
          <p className="text-slate-400">Nenhum cliente registado ainda.</p>
          <p className="text-slate-300 text-sm mt-1">Os clientes são criados ao adicioná-los a um evento.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {clients.map(client => (
            <div
              key={client.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-slate-500 text-sm font-medium">
                  {client.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-medium">{client.full_name}</p>
                <div className="flex items-center gap-4 mt-0.5">
                  {client.email && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Mail className="w-3 h-3" />{client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <Phone className="w-3 h-3" />{client.phone}
                    </span>
                  )}
                  {client.company && (
                    <span className="flex items-center gap-1 text-slate-300 text-xs">
                      <Building2 className="w-3 h-3" />{client.company}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
