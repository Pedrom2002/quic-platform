// Valida as env vars obrigatorias assim que o servidor arranca, para falhar
// rapido no deploy em vez de um 500 em runtime na primeira request que as usa.
// Ver lib/env.ts (getEnv ja lanca erro em caso de env invalida/em falta).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getEnv } = await import('@/lib/env')
    try {
      getEnv()
    } catch (err) {
      console.error('[instrumentation] validacao de env falhou no arranque:', err)
      throw err
    }
  }
}
