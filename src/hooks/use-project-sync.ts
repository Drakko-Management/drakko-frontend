import { useEffect } from 'react'
import { queryClient } from '@/lib/query-client'

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
