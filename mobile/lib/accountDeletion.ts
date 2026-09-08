// mobile/lib/accountDeletion.ts
//
// Eliminacao de conta (App Store guideline 5.1.1(v), Play Data Safety).
// Chama a rota app/api/account/delete, que invoca a RPC delete_own_account.

export type DeleteAccountResult = { success: true } | { success: false; error: string }

export async function deleteOwnAccount(
  appBaseUrl: string,
  accessToken: string
): Promise<DeleteAccountResult> {
  try {
    const response = await fetch(`${appBaseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      return { success: false, error: body?.error ?? 'Não foi possível eliminar a conta.' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Erro de ligação. Tenta novamente.' }
  }
}
