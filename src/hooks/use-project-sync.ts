import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import type { ProjectStatus } from '@/types/api'

const PENDING_STATUSES: ReadonlySet<string> = new Set<ProjectStatus>([
  'AWAITING_SIGNATURE',
  'AWAITING_RESERVE_LIFT',
])

const LIVE_REFRESH_MS = 10_000

/**
 * La page de signature s'ouvre dans un autre onglet et prévient l'onglet d'origine
 * (`postMessage`) une fois le chantier signé. On rafraîchit alors toutes les données
 * liées aux chantiers (liste, fiche, PDF) quelle que soit la page affichée.
 */
export function useProjectUpdateSync() {
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if ((e.data as { type?: string } | null)?.type !== 'project_updated') return
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['report-pdf'] })
      void queryClient.invalidateQueries({ queryKey: ['reserve-lift-pdf'] })
    }
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage) }
  }, [])
}

/** Vrai si la donnée en cache (fiche ou liste paginée) contient un chantier en attente d'une signature. */
export function hasPendingProject(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const { status, data: items } = data as { status?: unknown; data?: unknown }
  if (typeof status === 'string') return PENDING_STATUSES.has(status)
  return (
    Array.isArray(items) &&
    items.some((p) => PENDING_STATUSES.has((p as { status?: string } | null)?.status ?? ''))
  )
}

/** Rafraîchit d'un coup tout ce qui est affiché sur les chantiers, tant qu'un chantier affiché attend une signature. */
export function refreshPendingProjects(client: QueryClient): Promise<void> {
  const active = client.getQueryCache().findAll({ queryKey: ['projects'], type: 'active' })
  if (!active.some((q) => hasPendingProject(q.state.data))) return Promise.resolve()
  // cancelRefetch: false → sur réseau lent, une requête en cours n'est pas annulée à chaque tick
  return client.refetchQueries({ queryKey: ['projects'], type: 'active' }, { cancelRefetch: false })
}

/**
 * Un client qui signe depuis son téléphone (lien reçu par email) n'a aucun lien avec l'onglet de l'employé.
 * On interroge donc le serveur à intervalle régulier, uniquement si un chantier affiché attend une signature
 * et que l'onglet est visible. Un seul rythme pour fiche, liste et compteurs, afin qu'ils restent cohérents.
 */
export function useProjectLiveRefresh() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void refreshPendingProjects(queryClient)
    }, LIVE_REFRESH_MS)
    return () => { window.clearInterval(timer) }
  }, [])
}
