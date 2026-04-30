const URL = 'https://zzxgumtzehfkxzqyjqjf.supabase.co'
const KEY = 'SUPABASE_SECRET_REDACTED'
const ORG = '00000000-0000-0000-0000-000000000001'

const headers = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
}

const templates = [
  {
    name: 'Etapa concluída — email',
    subject: '{{item_client_label}} — {{event_name}}',
    body_template: `{{client_name}},

Tudo a correr bem na preparação do seu evento.

A etapa "{{item_client_label}}" acaba de ser concluída pela nossa equipa — mais um passo rumo a um evento impecável.

{{#if completion_note}}{{completion_note}}{{/if}}

Neste momento, o evento encontra-se a {{progress_percent}}% de preparação. Acompanhe cada detalhe em tempo real no portal exclusivo do seu evento:

{{portal_url}}

Qualquer questão, estamos aqui.

Equipa Quic`,
  },
  {
    name: 'Boas-vindas ao portal',
    subject: 'O seu evento "{{event_name}}" está em preparação',
    body_template: `{{client_name}},

É com muito prazer que damos início à preparação do seu evento "{{event_name}}".

A nossa equipa já está a trabalhar em cada detalhe. Para que esteja sempre a par do progresso, criámos um portal exclusivo onde pode acompanhar, em tempo real, cada etapa da organização:

{{portal_url}}

Este link é único e foi criado especificamente para o seu evento. Pode partilhá-lo com a sua equipa sempre que quiser.

Estamos à sua disposição para qualquer questão.

Equipa Quic`,
  },
]

for (const t of templates) {
  const res = await fetch(
    `${URL}/rest/v1/message_templates?name=eq.${encodeURIComponent(t.name)}&organization_id=eq.${ORG}`,
    { method: 'PATCH', headers, body: JSON.stringify({ subject: t.subject, body_template: t.body_template }) }
  )
  console.log(t.name, res.status, res.ok ? '✓' : await res.text())
}
