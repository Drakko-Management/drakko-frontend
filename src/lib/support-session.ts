import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/store/auth.store'
import type { Permissions, UserRole } from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL

/** Ce que renvoie `POST /platform/organizations/:id/support-session` */
export interface SupportGrant {
  accessToken: string
  expiresAt: string
  reason: string
  organization: { id: string; name: string }
  user: { id: string; username: string; firstName: string; lastName: string; role: UserRole }
}

interface Me {
  firstName?: string
  lastName?: string
  navSlots?: string[]
  defaultFilters?: Record<string, unknown>
  customRole?: { name: string; permissions: Permissions } | null
}

/**
 * Ouvre l'application comme la personne choisie, en lecture seule (ADR-028). Le jeton reste en mémoire : jamais de
 * jeton de renouvellement (setAuth sans 3ᵉ argument n'écrit rien dans le stockage local), jamais `clearAuth` (qui
 * l'effacerait) ni la langue ou le thème du compte vu, pour ne rien changer aux préférences de ce navigateur.
 */
export async function enterSupportSession(grant: SupportGrant): Promise<void> {
  queryClient.clear()
  const store = useAuthStore.getState()
  store.setAuth(grant.accessToken, grant.user.username)
  store.setName(grant.user.firstName, grant.user.lastName)
  try {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${grant.accessToken}` },
    })
    if (res.ok) {
      const me = (await res.json()) as Me
      store.setPermissions(me.customRole?.permissions ?? null)
      store.setCustomRoleName(me.customRole?.name ?? null)
      store.setNavSlots(me.navSlots ?? [])
      store.setDefaultFilters(me.defaultFilters)
    }
  } catch {
    // le profil se relira : la session est ouverte quand même
  }
  // Le super admin a passé sa propre double authentification : on ne le renvoie pas vers la configuration de la
  // personne vue
  store.setTwoFactorRequired(false)
  store.setSupport({
    expiresAt: new Date(grant.expiresAt).getTime(),
    reason: grant.reason,
    organizationName: grant.organization.name,
    viewingAs: `${grant.user.firstName} ${grant.user.lastName}`.trim() || grant.user.username,
  })
}

/**
 * Quitte le mode dépannage : la page se recharge sur la plateforme. Un rechargement complet est le moyen le plus sûr
 * de ne rien garder du client en mémoire (données, magasin, requêtes en cours) ; la session plateforme, elle, se
 * reprend par son cookie.
 */
export function leaveSupportSession(): void {
  sessionStorage.removeItem('username')
  sessionStorage.removeItem('firstName')
  sessionStorage.removeItem('lastName')
  window.location.assign('/plateforme')
}
