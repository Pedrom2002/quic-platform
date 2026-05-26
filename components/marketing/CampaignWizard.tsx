'use client'

import { useState } from 'react'
import { TemplateEditor } from './TemplateEditor'

interface List {
  id: string
  name: string
  contact_count: number
}

interface Props {
  lists: List[]
  onSubmit: (data: FormData) => Promise<void>
}

export function CampaignWizard({ lists, onSubmit }: Props) {
  const [step, setStep] = useState(1)
  const [listId, setListId] = useState('')
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [aiObjective, setAiObjective] = useState('')
  const [aiPersonalize, setAiPersonalize] = useState(false)
  const [scheduleNow, setScheduleNow] = useState(true)
  const [scheduledAt, setScheduledAt] = useState('')
  const [followupEnabled, setFollowupEnabled] = useState(false)
  const [followupDays, setFollowupDays] = useState(3)
  const [followupSubject, setFollowupSubject] = useState('')
  const [followupBody, setFollowupBody] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const selectedList = lists.find(l => l.id === listId)

  async function generateWithAi() {
    if (!aiObjective) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate-marketing-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: aiObjective,
          contact: {},
          tone: 'formal',
          mode: aiPersonalize ? 'opening-only' : 'full',
        }),
      })
      const data = await res.json() as { subject?: string; body?: string; opening?: string }
      if (data.subject) setSubject(data.subject)
      if (data.body) setBody(data.body)
      if (data.opening) setBody(`<p>${data.opening}</p><p>...</p>`)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    const fd = new FormData()
    fd.append('name', name)
    fd.append('list_id', listId)
    fd.append('subject_template', subject)
    fd.append('body_template', body)
    fd.append('ai_objective', aiObjective)
    fd.append('ai_personalize', String(aiPersonalize))
    fd.append('schedule_now', String(scheduleNow))
    if (!scheduleNow && scheduledAt) fd.append('scheduled_at', scheduledAt)
    fd.append('followup_enabled', String(followupEnabled))
    fd.append('followup_days', String(followupDays))
    fd.append('followup_subject', followupSubject)
    fd.append('followup_body', followupBody)
    await onSubmit(fd)
    setSubmitting(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">1. Nome e Lista</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Nome da campanha</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="Outreach Patrocinadores — Junho" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lista de contactos</label>
            <select value={listId} onChange={e => setListId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Selecionar lista...</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.contact_count} contactos)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">2. Template de Email</h2>
          <div className="border rounded-lg p-4 bg-zinc-50 space-y-3">
            <p className="text-sm font-medium">Gerar com IA</p>
            <input value={aiObjective} onChange={e => setAiObjective(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm bg-white"
              placeholder="Ex: Conseguir patrocinador para o Festival X em junho" />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="personalize" checked={aiPersonalize}
                onChange={e => setAiPersonalize(e.target.checked)} />
              <label htmlFor="personalize" className="text-sm">Personalizar só a abertura (modo híbrido)</label>
            </div>
            <button type="button" onClick={generateWithAi} disabled={!aiObjective || aiLoading}
              className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
              {aiLoading ? 'A gerar...' : 'Gerar com IA'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assunto</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Ex: Parceria {{empresa}} — Festival X" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Corpo</label>
            <TemplateEditor value={body} onChange={setBody} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">3. Agendamento</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="radio" checked={scheduleNow} onChange={() => setScheduleNow(true)} />
              <span className="text-sm">Enviar agora</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!scheduleNow} onChange={() => setScheduleNow(false)} />
              <span className="text-sm">Agendar</span>
            </label>
            {!scheduleNow && (
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="border rounded px-3 py-2 text-sm ml-6" />
            )}
          </div>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="followup" checked={followupEnabled}
                onChange={e => setFollowupEnabled(e.target.checked)} />
              <label htmlFor="followup" className="text-sm font-medium">Ativar followup automático</label>
            </div>
            {followupEnabled && (
              <div className="space-y-3 ml-6">
                <div>
                  <label className="block text-sm mb-1">Dias sem abertura antes de followup</label>
                  <input type="number" value={followupDays} onChange={e => setFollowupDays(Number(e.target.value))}
                    min={1} max={30} className="border rounded px-3 py-2 text-sm w-24" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Assunto do followup</label>
                  <input value={followupSubject} onChange={e => setFollowupSubject(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Re: {{empresa}} — ainda com interesse?" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Corpo do followup</label>
                  <textarea value={followupBody} onChange={e => setFollowupBody(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm h-24"
                    placeholder="Olá {{nome}}, queria apenas confirmar..." />
                </div>
              </div>
            )}
          </div>
          {selectedList && (
            <p className="text-xs text-zinc-500">
              Estimativa: ~{Math.ceil(selectedList.contact_count / 10)} min de envio (10 emails/min)
            </p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">4. Revisão</h2>
          <div className="border rounded-lg p-4 space-y-2 text-sm">
            <p><span className="font-medium">Campanha:</span> {name}</p>
            <p><span className="font-medium">Lista:</span> {selectedList?.name} ({selectedList?.contact_count} contactos)</p>
            <p><span className="font-medium">Assunto:</span> {subject}</p>
            <p><span className="font-medium">Envio:</span> {scheduleNow ? 'Agora' : scheduledAt}</p>
            <p><span className="font-medium">Followup:</span> {followupEnabled ? `Sim, após ${followupDays} dias` : 'Não'}</p>
          </div>
          <div className="border rounded-lg p-4 bg-zinc-50">
            <p className="text-xs font-medium mb-2 text-zinc-500">PREVIEW</p>
            <p className="text-sm font-medium">{subject}</p>
            <div className="text-sm mt-2 text-zinc-600" dangerouslySetInnerHTML={{ __html: body }} />
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="px-4 py-2 rounded border text-sm font-medium hover:bg-zinc-50">
            Anterior
          </button>
        ) : <div />}
        {step < 4 ? (
          <button type="button" onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && (!name || !listId)}
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            Seguinte
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {submitting ? 'A criar...' : 'Confirmar e Enviar'}
          </button>
        )}
      </div>
    </div>
  )
}
