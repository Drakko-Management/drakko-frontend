import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_MS = 60 * 60 * 1000
const MIN_GAP_MS = 30 * 1000

/**
 * Mises à jour automatiques (`registerType: "autoUpdate"`) : dès qu'une nouvelle version est
 * installée, elle prend la main et la page se recharge toute seule, sans bouton.
 *
 * Une appli installée ou laissée ouverte ne cherche pas de mise à jour d'elle-même : on la cherche
 * toutes les heures, au retour sur l'appli et à chaque changement d'écran.
 * Le rechargement efface ce qui est affiché : on ne cherche donc pas tant que l'utilisateur a saisi
 * quelque chose sur l'écran courant ou qu'un enregistrement est en cours. La recherche reprend
 * dès qu'il change d'écran.
 */
export function PwaAutoUpdate() {
  const { pathname } = useLocation()
  const queryClient = useQueryClient()
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const typed = useRef(false)
  const lastCheck = useRef(0)

  useRegisterSW({
    onRegisteredSW(_url, reg) {
      registration.current = reg
    },
  })

  const checkForUpdate = useCallback(() => {
    const reg = registration.current
    if (!reg || typed.current || queryClient.isMutating() > 0) return
    const now = Date.now()
    if (now - lastCheck.current < MIN_GAP_MS) return
    lastCheck.current = now
    void reg.update().catch(() => undefined)
  }, [queryClient])

  // Saisie en cours sur l'écran (texte, case, fichier choisi…) : un rechargement la ferait perdre
  useEffect(() => {
    const markTyped = () => { typed.current = true }
    document.addEventListener('input', markTyped, true)
    return () => { document.removeEventListener('input', markTyped, true) }
  }, [])

  useEffect(() => {
    const timer = setInterval(checkForUpdate, UPDATE_CHECK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [checkForUpdate])

  // Changement d'écran : la saisie précédente n'est plus affichée, on peut chercher
  useEffect(() => {
    typed.current = false
    checkForUpdate()
  }, [pathname, checkForUpdate])

  return null
}
