import { ApiError, apiRequest } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'

/**
 * Déconnecte côté serveur, puis efface la session locale. N'efface RIEN si le serveur n'a pas confirmé :
 * l'appel supprime les jetons de rafraîchissement et le cookie de session. Effacer l'état local alors qu'il
 * échoue (réseau coupé, erreur serveur) afficherait « déconnecté » alors que le cookie reste valable, et
 * quiconque rouvre l'application, sur un téléphone partagé par exemple, serait reconnecté.
 *
 * 'done'   : session révoquée (ou déjà inexistante), l'interface peut revenir à la connexion
 * 'failed' : session toujours ouverte, à signaler à la personne pour qu'elle réessaie
 */
export async function logout(): Promise<'done' | 'failed'> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } catch (err) {
    // 401 : le jeton est expiré, puis le rafraîchissement a échoué. Si l'état local a été vidé, le serveur a
    // refusé la session (rien à révoquer) ; s'il est resté, c'est le rafraîchissement qui n'a pas pu aboutir
    // (réseau) : la session existe encore
    const sessionGone = err instanceof ApiError && err.status === 401 && useAuthStore.getState().accessToken === null
    if (!sessionGone) return 'failed'
  }
  useAuthStore.getState().clearAuth()
  return 'done'
}
