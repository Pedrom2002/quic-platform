'use client'

import { useState, useEffect, useRef } from 'react'
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser'

type ScanResult = { valid: true; name: string } | { valid: false; reason: 'already_used' | 'not_found' }
type UIState = 'idle' | 'scanning' | 'valid' | 'already_used' | 'not_found'

export default function ScanPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [ui, setUi] = useState<UIState>('idle')
  const [winnerName, setWinnerName] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('pt-scan')
    if (stored) setAuthed(true)
  }, [])

  useEffect(() => {
    if (!authed) return
    startScanner()
    return () => { controlsRef.current?.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  async function startScanner() {
    if (!videoRef.current) return
    const reader = new BrowserQRCodeReader()
    controlsRef.current = await reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      async (result) => {
        if (!result || processingRef.current) return
        const text = result.getText()
        const match = text.match(/\/portugal\/qr\/([a-f0-9]+)$/)
        if (!match) return
        const token = match[1]
        processingRef.current = true
        await validate(token)
        setTimeout(() => {
          processingRef.current = false
          setUi('scanning')
        }, 3000)
      }
    )
    setUi('scanning')
  }

  async function validate(token: string) {
    const adminToken = sessionStorage.getItem('pt-scan') ?? ''
    const res = await fetch('/api/portugal/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ token }),
    })
    if (res.status === 401) {
      sessionStorage.removeItem('pt-scan')
      setAuthed(false)
      return
    }
    const data = await res.json() as ScanResult
    if (data.valid) {
      setWinnerName(data.name)
      setUi('valid')
    } else {
      setUi(data.reason)
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    sessionStorage.setItem('pt-scan', password)
    setAuthed(true)
  }

  if (!authed) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-4">
        <h1 className="text-xl font-bold text-center">Scan QR — Staff</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2.5"
          >
            Abrir Scanner
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
        <video ref={videoRef} className="w-full h-full object-cover" />

        {ui === 'valid' && (
          <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center text-white space-y-2">
            <div className="text-5xl">&#10003;</div>
            <p className="text-xl font-bold">{winnerName}</p>
            <p className="text-sm">Cerveja valida!</p>
          </div>
        )}

        {ui === 'already_used' && (
          <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center text-white space-y-2">
            <div className="text-5xl">&#10007;</div>
            <p className="text-xl font-bold">JA UTILIZADO</p>
          </div>
        )}

        {ui === 'not_found' && (
          <div className="absolute inset-0 bg-gray-800/90 flex flex-col items-center justify-center text-white space-y-2">
            <div className="text-5xl">?</div>
            <p className="text-xl font-bold">INVALIDO</p>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-white/80">
        {ui === 'scanning' ? 'Aponta a camara para o QR' : 'A reiniciar...'}
      </p>
    </div>
  )
}
