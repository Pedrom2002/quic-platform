import { createClient } from '@/lib/supabase/server'
import { CheckSquare, FileText } from 'lucide-react'
import type { TemplateWithJoins } from '@/types/app'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('*, event_types(name, color), checklist_template_items(id)')
    .eq('is_active', true)
    .order('created_at', { ascending: false }) as unknown as { data: TemplateWithJoins[] | null }

  const { data: messageTemplates } = await supabase
    .from('message_templates')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-500 mt-1">Checklists e mensagens pré-definidas por tipo de evento</p>
      </div>

      <section className="mb-10">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Checklists
        </h2>
        {!templates?.length ? (
          <p className="text-slate-400 text-sm">Nenhum template de checklist encontrado.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
            {templates.map(t => {
              const etColor = t.event_types?.color ?? '#6b7280'
              const itemCount = t.checklist_template_items?.length ?? 0
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: etColor + '20' }}
                  >
                    <CheckSquare className="w-4 h-4" style={{ color: etColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium">{t.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{t.event_types?.name} · {itemCount} etapas</p>
                  </div>
                  <span className="text-xs text-slate-300">v{t.version}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Templates de Mensagem
        </h2>
        {!messageTemplates?.length ? (
          <p className="text-slate-400 text-sm">Nenhum template de mensagem encontrado.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
            {messageTemplates.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{m.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5 capitalize">{m.channel} · {m.language}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
