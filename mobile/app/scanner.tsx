import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSession } from '../hooks/useSession'
import { resolveUserRole, type UserRole } from '../lib/role'
import { supabase } from '../lib/supabase'
import { checkInTicket } from '../lib/checkin'

export default function ScannerScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [lastResult, setLastResult] = useState<string | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission, requestPermission])

  if (!role) return null

  if (role.role !== 'staff') {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>Acesso reservado à equipa Quic</Text>
      </View>
    )
  }

  async function handleScan({ data }: { data: string }) {
    const result = await checkInTicket(supabase, data)
    setLastResult(result.success ? 'Bilhete validado' : (result.error ?? 'Erro'))
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      {lastResult && (
        <View style={styles.resultBanner}>
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
  resultBanner: { position: 'absolute', bottom: 40, left: 24, right: 24, backgroundColor: '#111111', padding: 16, borderRadius: 6 },
  resultText: { color: '#ffffff', textAlign: 'center', fontWeight: '600' },
})
