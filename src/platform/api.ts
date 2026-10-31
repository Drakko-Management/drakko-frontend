import { apiErrorFromResponse, ApiError } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { usePlatformStore } from './store'
import type { PlatformAdmin } from './types'

const API_URL = import.meta.env.VITE_API_URL
const LOCK_NAME = 'drakko-platform-refresh'

// Renouvelle la session par le cookie httpOnly. Une requête à la fois pour tous les onglets (le jeton est à usage
// unique) ; null = le serveur refuse (reconnexion), false = réseau indisponible (on ne déconnecte pas).
async function postRefresh(): Promise<string | null | false> {
  try {
    const res = await fetch(`${API_URL}/platform/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (res.status === 401 || res.status === 403) return null
    if (!res.ok) return false
    return ((await res.json()) as { accessToken: string }).accessToken
  } catch {
    return false
  }
}

let inFlight: Promise<string | null | false> | null = null

export function refreshPlatformSession(): Promise<string | null | false> {
  inFlight ??= (async () => {
    try {
      const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
      return locks ? await locks.request(LOCK_NAME, postRefresh) : await postRefresh()
    } catch {
      return postRefresh()
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

async function send(path: string, options: RequestInit, token: string | null): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  })
}

/** Appel authentifié de la plateforme : un 401 tente un renouvellement, puis renvoie vers la connexion. */
export async function platformRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const store = usePlatformStore.getState()
  let res = await send(path, options, store.accessToken)

  if (res.status === 401) {
    const renewed = await refreshPlatformSession()
    if (!renewed) {
      if (renewed === null) usePlatformStore.getState().clear()
      throw new ApiError(401, 'Session expired')
    }
    usePlatformStore.getState().setSession(renewed)
    res = await send(path, options, renewed)
  }
  if (!res.ok) throw await apiErrorFromResponse(res)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

/** Appel sans jeton (ouverture de session) : les étapes de connexion portent leur propre jeton dans le corps. */
export async function platformPublicRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await send(path, { method: 'POST', body: JSON.stringify(body) }, null)
  if (!res.ok) throw await apiErrorFromResponse(res)
  return (await res.json()) as T
}

export function startPlatformSession(accessToken: string): void {
  usePlatformStore.getState().setSession(accessToken)
}

export async function loadPlatformAdmin(): Promise<PlatformAdmin> {
  const admin = await platformRequest<PlatformAdmin>('/platform/auth/me')
  usePlatformStore.getState().setAdmin(admin)
  return admin
}

export async function endPlatformSession(): Promise<void> {
  try {
    await platformRequest('/platform/auth/logout', { method: 'POST' })
  } catch {
    // le serveur est injoignable ou la session déjà finie : on ferme quand même ce côté-ci
  }
  usePlatformStore.getState().clear()
  queryClient.removeQueries({ queryKey: ['platform'] })
}
