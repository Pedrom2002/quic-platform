'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckSquare, FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { MessageTemplate } from '@/types/database'
import { TEMPLATE_KEYS, type MessageTemplateInput, type TemplateKey } from '@/schemas/template.schema'

const TEMPLATE_KEY_LABEL: Record<TemplateKey, string> = {
  checklist_complete: 'Conclusão de etapa',
  welcome: 'Boas-vindas (envio do portal)',
  client_update: 'Comunicação ao cliente',
  custom: 'Personalizado',
}
import {
  loadMessageTemplatesAction,
  createMessageTemplateAction,
  updateMessageTemplateAction,
  deactivateMessageTemplateAction,
} from './actions'
import { createClient } from '@/lib/supabase/client'
import type { TemplateWithJoins } from '@/types/app'

const EMPTY_FORM: MessageTemplateInput = {
  name: '',
  channel: 'email',
  language: 'pt',
  template_key: 'custom',
  subject: '',
  body_template: '',
}

export default function TemplatesPage() {
  const [checklistTemplates, setChecklistTemplates] = useState<TemplateWithJoins[]>([])
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [form, setForm] = useState<MessageTemplateInput>(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data: ct }, msgTemplates] = await Promise.all([
        supabase
          .from('checklist_templates')
          .select('*, event_types(name, color), checklist_template_items(id)')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        loadMessageTemplatesAction(),
      ])
      setChecklistTemplates((ct ?? []) as unknown as TemplateWithJoins[])
      setMessageTemplates(msgTemplates)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(t: MessageTemplate) {
    setEditing(t)
    setForm({
      name: t.name,
      channel: t.channel as MessageTemplateInput['channel'],
      language: (t.language ?? 'pt') as MessageTemplateInput['language'],
      template_key: ((t.template_key ?? 'custom') as TemplateKey),
      subject: t.subject ?? '',
      body_template: t.body_template,
    })
    setDialogOpen(true)
  }

  function save() {
    startTransition(async () => {
      try {
        if (editing) {
          await updateMessageTemplateAction(editing.id, form)
          toast.success('Template atualizado')
        } else {
          await createMessageTemplateAction(form)
          toast.success('Template criado')
        }
        setDialogOpen(false)
        await loadAll()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  function deactivate(id: string) {
    if (!confirm('Desativar este template?')) return
    startTransition(async () => {
      try {
        await deactivateMessageTemplateAction(id)
        toast.success('Template desativado')
        await loadAll()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      }
    })
  }

  const canSave = form.name.trim().length > 0 && form.body_template.trim().length > 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-500 mt-1">Checklists e mensagens pré-definidas por tipo de evento</p>
      </div>

      {/* Checklist templates — read only */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Checklists
        </h2>
        {loading ? (
          <p className="text-slate-400 text-sm">A carregar...</p>
        ) : !checklistTemplates.length ? (
          <p className="text-slate-400 text-sm">Nenhum template de checklist encontrado.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
            {checklistTemplates.map(t => {
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

      {/* Message templates — full CRUD */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Templates de Mensagem
          </h2>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo template
          </Button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">A carregar...</p>
        ) : !messageTemplates.length ? (
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
                  <p className="text-slate-400 text-xs mt-0.5 capitalize">
                    {m.channel} · {m.language} · {TEMPLATE_KEY_LABEL[(m.template_key ?? 'custom') as TemplateKey] ?? m.template_key}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)} disabled={isPending} className="text-slate-400 hover:text-slate-700">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deactivate(m.id)} disabled={isPending} className="text-slate-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {editing ? 'Editar Template' : 'Novo Template de Mensagem'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Confirmação de entrega"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Canal</Label>
                <Select
                  value={form.channel}
                  onValueChange={v => setForm(p => ({ ...p, channel: v as MessageTemplateInput['channel'] }))}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700">Idioma</Label>
                <Select
                  value={form.language}
                  onValueChange={v => setForm(p => ({ ...p, language: v as MessageTemplateInput['language'] }))}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Tipo de envio</Label>
              <Select
                value={form.template_key}
                onValueChange={v => setForm(p => ({ ...p, template_key: v as TemplateKey }))}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_KEYS.map(k => (
                    <SelectItem key={k} value={k}>{TEMPLATE_KEY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Determina em que ação o template é usado. Apenas um template ativo por tipo, canal e idioma.
              </p>
            </div>
            {form.channel === 'email' && (
              <div className="space-y-1.5">
                <Label className="text-slate-700">Assunto</Label>
                <Input
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Ex: Atualização do seu evento"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-700">Corpo *</Label>
              <Textarea
                value={form.body_template}
                onChange={e => setForm(p => ({ ...p, body_template: e.target.value }))}
                rows={6}
                placeholder="Olá {{client_name}},&#10;&#10;O item {{item_client_label}} foi concluído.&#10;&#10;{{portal_url}}"
                className="font-mono text-sm resize-y"
              />
              <p className="text-xs text-slate-400">
                Variáveis: {'{{client_name}}'}, {'{{event_name}}'}, {'{{event_date}}'}, {'{{item_client_label}}'}, {'{{portal_url}}'}, {'{{progress_percent}}'}
              </p>
            </div>
            <Button onClick={save} disabled={!canSave || isPending} className="w-full">
              {isPending ? 'A guardar...' : editing ? 'Guardar alterações' : 'Criar template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
