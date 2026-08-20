import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSession } from '../hooks/useSession'
import { resolveUserRole, type UserRole } from '../lib/role'
import { supabase } from '../lib/supabase'
import { checkInTicket } from '../lib/checkin'
import { QUIC_MAGENTA } from '../lib/theme'

export default function ScannerScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [lastResult, setLastResult] = useState<string | null>(null)
  const scanningRef = useRef(false)

  const [roleError, setRoleError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRoleError(false)
    resolveUserRole(supabase, session)
      .then(r => { if (!cancelled) setRole(r) })
      .catch(() => { if (!cancelled) setRoleError(true) })
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission, requestPermission])

  if (roleError) {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>Não foi possível carregar o teu perfil. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  if (!role) {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>A carregar...</Text>
      </View>
    )
  }

  if (role.role !== 'staff') {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>Acesso reservado à equipa Quic</Text>
      </View>
    )
  }

  async function handleScan({ data }: { data: string }) {
    if (scanningRef.current) return
    scanningRef.current = true
    const result = await checkInTicket(supabase, data)
    setLastResult(result.success ? 'Bilhete validado' : (result.error ?? 'Erro'))
    setTimeout(() => {
      scanningRef.current = false
    }, 1500)
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
        accessibilityLabel="Câmara para ler código QR do bilhete"
      />
      {lastResult && (
        <View
          style={styles.resultBanner}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={lastResult}
        >
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
  resultBanner: { position: 'absolute', bottom: 40, left: 24, right: 24, backgroundColor: QUIC_MAGENTA, padding: 16, borderRadius: 6 },
  resultText: { color: '#ffffff', textAlign: 'center', fontWeight: '600' },
})
