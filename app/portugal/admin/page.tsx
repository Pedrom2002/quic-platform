'use client'

import { useState, useEffect, useCallback } from 'react'

type Winner = {
  name: string
  phone: string
  qr_token: string
  sms_error?: string
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [drawCount, setDrawCount] = useState(1)
  const [drawing, setDrawing] = useState(false)
  const [drawn, setDrawn] = useState(false)
  const [winners, setWinners] = useState<Winner[]>([])
  const [drawError, setDrawError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = sessionStorage.getItem('pt-admin')
    if (storedToken) setAuthed(true)
  }, [])

  const fetchCount = useCallback(async (token: string) => {
    const res = await fetch('/api/portugal/count', {
      headers: { 'x-admin-token': token },
    })
    if (res.status === 401) {
      sessionStorage.removeItem('pt-admin')
      setAuthed(false)
      setAuthError(true)
      return
    }
    if (res.ok) {
      const d = await res.json() as { count: number }
      setCount(d.count)
    }
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem('pt-admin')
    if (!authed || !token) return
    fetchCount(token)
    const interval = setInterval(() => fetchCount(token), 30000)
    return () => clearInterval(interval)
  }, [authed, fetchCount])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    sessionStorage.setItem('pt-admin', password)
    setAuthed(true)
    setAuthError(false)
  }

  async function handleDraw() {
    const token = sessionStorage.getItem('pt-admin') ?? ''
    setDrawing(true)
    setDrawError(null)

    const res = await fetch('/api/portugal/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ count: drawCount }),
    })

    const data = await res.json() as { winners?: Winner[]; error?: string }
    setDrawing(false)

    if (!res.ok) {
      if (res.status === 401) {
        setAuthed(false)
        sessionStorage.removeItem('pt-admin')
        setAuthError(true)
      }
      if (res.status === 409) {
        setDrawError('Sorteio ja foi realizado.')
      } else {
        setDrawError(data.error ?? 'Erro ao sortear.')
      }
      return
    }

    setWinners(data.winners ?? [])
    setDrawn(true)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-4">
        <h1 className="text-xl font-bold text-center">Admin — Portugal</h1>
        {authError && (
          <p className="text-sm text-red-600 text-center">Password incorreta.</p>
        )}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password admin"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2.5"
          >
            Entrar
          </button>
        </form>
      </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin — Sorteio Portugal</h1>
        <span className="text-sm text-gray-500">
          {count !== null ? `${count} registos` : 'A carregar...'}
        </span>
      </div>

      {!drawn && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numero de vencedores
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={drawCount}
              onChange={e => setDrawCount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            onClick={handleDraw}
            disabled={drawing || drawn}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg px-6 py-2.5 transition-colors"
          >
            {drawing ? 'A sortear...' : 'Sortear agora'}
          </button>
        </div>
      )}

      {drawError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{drawError}</p>
      )}

      {winners.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Vencedores ({winners.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Nome</th>
                  <th className="pb-2 pr-4">Telemovel</th>
                  <th className="pb-2 pr-4">SMS</th>
                  <th className="pb-2">QR</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{w.name}</td>
                    <td className="py-2 pr-4 text-gray-600">{w.phone}</td>
                    <td className="py-2 pr-4">
                      {w.sms_error
                        ? <span className="text-red-600">Falhou</span>
                        : <span className="text-green-600">Enviado</span>}
                    </td>
                    <td className="py-2">
                      <a
                        href={`/portugal/qr/${w.qr_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline"
                      >
                        Ver QR
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
