import i18n from 'i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { refreshSession } from '@/lib/session-refresh'
import { leaveSupportSession } from '@/lib/support-session'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Erreur à partir d'une réponse non-OK. Le message du serveur est technique : on ne l'affiche jamais, on se sert du code. */
export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[]; code?: string }
  const message = Array.isArray(body.message) ? body.message.join(', ') : body.message
  return new ApiError(res.status, message ?? res.statusText, body.code)
}

let refreshingModules = false

// Un 403 MODULE_NOT_ACTIVE (ADR-029) veut dire que la liste des modules lue à l'ouverture est dépassée : le
// propriétaire du produit a coupé un module depuis. On la relit tout de suite plutôt que d'attendre la prochaine
// synchronisation, pour que les menus suivent.
async function refreshModules(): Promise<void> {
  if (refreshingModules) return
  refreshingModules = true
  try {
    const me = await apiRequest<{ modules?: string[] }>('/users/me')
    useAuthStore.getState().setModules(me.modules)
  } catch {
    // la session se relira à la prochaine synchronisation
  } finally {
    refreshingModules = false
  }
}

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

function waitForRefresh(): Promise<string | null> {
  return new Promise((resolve) => refreshQueue.push(resolve))
}

async function doRefresh(): Promise<string | null> {
  isRefreshing = true
  const result = await refreshSession()
  isRefreshing = false

  const { setAuth, clearAuth } = useAuthStore.getState()
  let newAccessToken: string | null = null

  if (result !== null && result !== false) {
    const username = sessionStorage.getItem('username') ?? ''
    setAuth(result.accessToken, username, result.refreshToken)
    newAccessToken = result.accessToken
  } else if (result === null) {
    // Échec auth explicite (401/403) → déconnexion
    clearAuth()
  }
  // result === false → erreur réseau → on ne déconnecte pas

  refreshQueue.forEach((cb) => cb(newAccessToken))
  refreshQueue = []
  return newAccessToken
}

async function fetchWithAuth(
  path: string,
  options: RequestInit,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {}

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
  })
}

/** Un fichier (le PDF d'un devis) : même session et même renouvellement que les appels JSON. */
export const apiBlob = (path: string): Promise<Blob> => apiRequest<Blob>(path, {}, 'blob')

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  as: 'json' | 'blob' = 'json',
): Promise<T> {
  const token = useAuthStore.getState().accessToken
  let res = await fetchWithAuth(path, options, token)

  if (res.status === 401) {
    // Une session de dépannage ne se renouvelle pas (et ne doit jamais toucher à la session du navigateur) : elle
    // est finie, on revient à la plateforme
    if (useAuthStore.getState().support) {
      leaveSupportSession()
      throw new ApiError(401, 'Support session ended')
    }
    let newToken: string | null

    if (isRefreshing) {
      newToken = await waitForRefresh()
    } else {
      newToken = await doRefresh()
    }

    if (!newToken) throw new ApiError(401, 'Session expired')
    res = await fetchWithAuth(path, options, newToken)
  }

  if (!res.ok) {
    const error = await apiErrorFromResponse(res)
    // Le serveur exige la double authentification de ce compte : l'interface le renvoie vers sa configuration
    if (error.code === 'TWO_FACTOR_REQUIRED') useAuthStore.getState().setTwoFactorRequired(true)
    if (error.code === 'MODULE_NOT_ACTIVE') void refreshModules()
    // Mode dépannage (ADR-028) : quel que soit l'écran qui a tenté d'écrire, on dit clairement que c'est la lecture
    // seule, pas une panne (l'écran, lui, affiche son message générique)
    if (error.code === 'SUPPORT_READ_ONLY') toast.error(i18n.t('platform.err_read_only'), { id: 'support-read-only' })
    throw error
  }

  if (res.status === 204) return undefined as T
  return (as === 'blob' ? res.blob() : res.json()) as Promise<T>
}
