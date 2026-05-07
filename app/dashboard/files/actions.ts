'use server'

import { createClient } from '@/lib/supabase/server'
import type { EventFileWithUploader } from '@/types/app'

export type FileWithEvent = EventFileWithUploader & {
  event: { id: string; name: string } | null
}

export async function loadAllFilesAction(): Promise<FileWithEvent[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return []

  const { data } = await supabase
    .from('event_files')
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url), event:events!event_id(id, name)')
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<FileWithEvent[]>()

  return data ?? []
}
