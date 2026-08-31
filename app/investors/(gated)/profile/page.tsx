import { getInvestorProfile } from '@/lib/investors/get-profile'
import { ProfileForm } from './ProfileForm'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusClasses(status: string): string {
  return STATUS_CLASSES[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
}

export default async function InvestorProfilePage() {
  const session = await getInvestorProfile()
  const profile = session.authenticated ? session.profile : null

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-zinc-500">Não foi possível carregar o teu perfil.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Perfil / KYC</h1>
      <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5 mb-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Email</p>
          <p className="text-sm font-medium text-zinc-900 truncate">{profile.email}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Estado</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClasses(profile.status)}`}>
            {statusLabel(profile.status)}
          </span>
        </div>
      </div>
      <ProfileForm initialFullName={profile.fullName} initialPhone={profile.phone ?? ''} />
    </div>
  )
}
