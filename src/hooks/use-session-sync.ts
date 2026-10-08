import { useEffect } from 'react'
import { apiRequest } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import type { Permissions } from '@/types/api'

const MIN_INTERVAL_MS = 60_000

interface Me {
  firstName?: string
  lastName?: string
  navSlots?: string[]
  customRole?: { name: string; permissions: Permissions } | null
}

/**
 * Les permissions, le nom du rôle et la navigation ne sont chargés qu'à l'ouverture de l'appli.
 * Si un admin les modifie pendant que le membre a l'appli ouverte, le membre garderait l'ancien
 * état jusqu'à sa prochaine connexion. On les relit donc quand l'utilisateur revient sur l'appli
 * (au plus une fois par minute).
 */
export function useSessionSync() {
  useEffect(() => {
    let last = Date.now()

    async function refresh() {
      try {
        const me = await apiRequest<Me>('/users/me')
        const s = useAuthStore.getState()
        s.setPermissions(me.customRole?.permissions ?? null)
        s.setCustomRoleName(me.customRole?.name ?? null)
        s.setNavSlots(me.navSlots ?? [])
        if (me.firstName !== undefined || me.lastName !== undefined) {
          s.setName(me.firstName ?? '', me.lastName ?? '')
        }
      } catch {
        // hors-ligne ou session expirée : api-client gère déjà la reconnexion
      }
    }

    function onVisible() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < MIN_INTERVAL_MS) return
      last = Date.now()
      void refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => { document.removeEventListener('visibilitychange', onVisible) }
  }, [])
}
