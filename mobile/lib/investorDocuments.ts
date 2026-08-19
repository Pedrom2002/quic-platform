import type { SupabaseClient } from '@supabase/supabase-js'

export interface InvestorDocument {
  id: string
  title: string
  type: string
  fileUrl: string
  uploadedAt: string
}

interface InvestorDocumentRow {
  id: string
  title: string
  type: string
  file_url: string
  uploaded_at: string
}

// Replica a query de app/investors/(gated)/documents/page.tsx no runtime
// mobile (React Native não tem Server Components). Sem filtro explícito
// por investidor: RLS (investor_sees_own_documents, migration 0066) já
// cobre tanto documentos ligados diretamente ao investidor como
// documentos ligados a projetos da sua organização — uma lógica composta
// que um simples .eq('investor_id', ...) replicaria incorretamente.
export async function fetchInvestorDocuments(supabase: SupabaseClient): Promise<InvestorDocument[]> {
  const { data } = await supabase
    .from('investor_documents')
    .select('id, title, type, file_url, uploaded_at')
    .order('uploaded_at', { ascending: false })

  const rows = (data ?? []) as unknown as InvestorDocumentRow[]

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    type: row.type,
    fileUrl: row.file_url,
    uploadedAt: row.uploaded_at,
  }))
}
