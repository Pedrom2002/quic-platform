import { createClient } from '@/lib/supabase/server'
import { CampaignWizard } from '@/components/marketing/CampaignWizard'
import { createCampaign } from './actions'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: lists } = await supabase
    .from('marketing_lists')
    .select('id, name, contact_count')
    .order('name')

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">Nova Campanha</h1>
      <CampaignWizard lists={lists ?? []} onSubmit={createCampaign} />
    </div>
  )
}
