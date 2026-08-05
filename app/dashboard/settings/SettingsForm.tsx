'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Building2, User, Lock } from 'lucide-react'
import type { TeamMember, Organization } from '@/types/database'

type MemberWithOrg = TeamMember & { organizations: Pick<Organization, 'name' | 'slug'> | null }

interface Props {
  member: MemberWithOrg
  userEmail: string
}

export function SettingsForm({ member, userEmail }: Props) {
  const org = member.organizations
  const [name, setName] = useState(member.full_name)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const supabase = createClient()

  async function saveProfile() {
    setSavingProfile(true)
    const { error } = await supabase
      .from('team_members')
      .update({ full_name: name })
      .eq('id', member.id)
    setSavingProfile(false)
    if (error) { toast.error(error.message); return }
    toast.success('Perfil atualizado')
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { toast.error('As passwords não coincidem'); return }
    if (newPassword.length < 6) { toast.error('A password deve ter pelo menos 6 caracteres'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password alterada com sucesso')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="space-y-5">
      {/* Organização */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Organização</h2>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Nome</p>
            <p className="text-sm text-slate-700">{org?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Slug</p>
            <p className="text-sm text-slate-500 font-mono">{org?.slug ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Perfil */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Perfil</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-600">Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-white border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600">Email</Label>
            <Input value={userEmail} disabled className="bg-slate-50 border-slate-200 text-slate-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600">Função</Label>
            <p className="text-slate-500 text-sm capitalize">{member?.role ?? '—'}</p>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} size="sm">
            {savingProfile ? 'A guardar...' : 'Guardar perfil'}
          </Button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Alterar Password</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-600">Nova password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="bg-white border-slate-200" placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-600">Confirmar nova password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="bg-white border-slate-200" placeholder="Repetir password" />
          </div>
          <Button onClick={changePassword} disabled={savingPassword} size="sm">
            {savingPassword ? 'A alterar...' : 'Alterar password'}
          </Button>
        </div>
      </div>
    </div>
  )
}
