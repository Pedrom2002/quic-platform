import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Adapta o SecureStore (getItemAsync/setItemAsync/deleteItemAsync) à interface
// de storage do Supabase (getItem/setItem/removeItem), guardando os tokens de
// sessão de forma encriptada em vez de AsyncStorage em texto simples.
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// JS timers ficam suspensos com a app em background (ex: durante o checkout
// Stripe no browser externo), o que impede o refresh automático do token de
// disparar. Sem isto, a sessão pode parecer expirada ao regressar à app
// (ex: via deep link de sucesso do pagamento), forçando logout indevido.
AppState.addEventListener('change', state => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
