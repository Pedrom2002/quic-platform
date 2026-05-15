'use server'

import { getOrgAuth } from '@/lib/supabase/actions'
import type { EventFileWithUploader } from '@/types/app'

export type FileWithEvent = EventFileWithUploader & {
  event: { id: string; name: string } | null
}

export async function loadAllFilesAction(): Promise<FileWithEvent[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('event_files')
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url), event:events!event_id(id, name)')
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<FileWithEvent[]>()

  return data ?? []
}
