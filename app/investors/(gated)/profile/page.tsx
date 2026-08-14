import { getInvestorProfile } from '@/lib/investors/get-profile'
import { ProfileForm } from './ProfileForm'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-950/40 text-amber-400 border-amber-900',
  approved: 'bg-emerald-950/40 text-emerald-400 border-emerald-900',
  rejected: 'bg-red-950/40 text-red-400 border-red-900',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusClasses(status: string): string {
  return STATUS_CLASSES[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
}

export default async function InvestorProfilePage() {
  const session = await getInvestorProfile()
  const profile = session.authenticated ? session.profile : null

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-zinc-400">Não foi possível carregar o teu perfil.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-semibold text-white mb-6">Profile / KYC</h1>
      <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-5 mb-6 space-y-2">
        <p className="text-sm text-zinc-300">Email: {profile.email}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Estado:</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClasses(profile.status)}`}>
            {statusLabel(profile.status)}
          </span>
        </div>
      </div>
      <ProfileForm initialFullName={profile.fullName} initialPhone={profile.phone ?? ''} />
    </div>
  )
}
