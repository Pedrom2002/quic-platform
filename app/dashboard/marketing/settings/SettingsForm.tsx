'use client'

import { useActionState } from 'react'

type State = { ok: boolean; message: string } | null
type Action = (prev: State, formData: FormData) => Promise<{ ok: boolean; message: string }>

interface Defaults {
  host: string
  port: number
  username: string
  from_name: string
}

export function SettingsForm({ action, defaults }: { action: Action; defaults: Defaults }) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nome do remetente</label>
        <input name="from_name" defaultValue={defaults.from_name} required
          className="w-full border rounded px-3 py-2 text-sm" placeholder="Pedro Silva" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Servidor SMTP</label>
        <input name="host" defaultValue={defaults.host} required
          className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Porta</label>
        <input name="port" type="number" defaultValue={defaults.port} required
          className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email (username)</label>
        <input name="username" defaultValue={defaults.username} required type="email"
          className="w-full border rounded px-3 py-2 text-sm" placeholder="pedro@quic.pt" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input name="password" type="password" required
          className="w-full border rounded px-3 py-2 text-sm" placeholder="••••••••" />
        <p className="text-xs text-zinc-500 mt-1">Mesma password que usas no webmail</p>
      </div>

      {state && (
        <div className={`px-3 py-2 rounded text-sm border ${
          state.ok
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {state.message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending}
          className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-zinc-700 disabled:opacity-50">
          {pending ? 'A guardar e a verificar...' : 'Guardar e verificar'}
        </button>
      </div>
    </form>
  )
}
