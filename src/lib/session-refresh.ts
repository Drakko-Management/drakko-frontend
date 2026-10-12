import { getStoredRefreshToken, storeRefreshToken } from '@/store/auth.store'

const API_URL = import.meta.env.VITE_API_URL

export interface RefreshedSession {
  accessToken: string
  refreshToken: string
}

// RefreshedSession → session renouvelée
// null             → le serveur refuse la session (401/403) : il faut se reconnecter
// false            → réseau ou serveur indisponible : la session n'est pas jugée, on ne déconnecte pas
export type RefreshOutcome = RefreshedSession | null | false

const LOCK_NAME = 'drakko-session-refresh'

// Le verrou reste tenu pendant la requête : sans limite, un serveur qui ne répond pas bloquerait le renouvellement
// de tous les onglets (le navigateur n'abandonne une requête muette qu'au bout de plusieurs minutes)
const REQUEST_TIMEOUT_MS = 30_000

async function postRefresh(): Promise<RefreshOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    // Lu ici, une fois le verrou obtenu : un autre onglet a pu renouveler la session entre-temps
    const storedToken = getStoredRefreshToken()
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: storedToken ? { 'Content-Type': 'application/json' } : {},
      body: storedToken ? JSON.stringify({ refreshToken: storedToken }) : undefined,
      signal: controller.signal,
    })
    if (res.status === 401 || res.status === 403) return null
    if (!res.ok) return false
    const session = (await res.json()) as RefreshedSession
    // Écrit tout de suite, sous le verrou, et non quand l'écran réagit : dans un navigateur qui bloque les cookies
    // tiers, ce jeton du stockage local est le seul que l'onglet suivant présentera, et il ne doit pas lire l'ancien
    storeRefreshToken(session.refreshToken)
    return session
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Renouvelle la session auprès du serveur, une requête à la fois pour tous les onglets du navigateur.
 *
 * Le jeton de renouvellement est à usage unique et le cookie qui le porte est commun aux onglets. Quand
 * plusieurs onglets se renouvellent ensemble (rechargés par une mise à jour de l'appli, ouverts en même temps…),
 * ils présentaient tous le même jeton : l'un réussissait, les autres recevaient 401 et se déconnectaient (et un
 * jeton déjà utilisé, présenté après coup, fait supprimer toutes les sessions du compte). Le verrou les range à la
 * file : chacun présente le cookie que le précédent vient de recevoir.
 *
 * Sans `navigator.locks` (navigateur ancien), le comportement est celui d'avant.
 */
export async function refreshSession(): Promise<RefreshOutcome> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  if (!locks) return postRefresh()
  try {
    return await locks.request(LOCK_NAME, postRefresh)
  } catch {
    // Verrou refusé (contexte sans stockage…) : mieux vaut renouveler sans lui que ne pas renouveler
    return postRefresh()
  }
}
