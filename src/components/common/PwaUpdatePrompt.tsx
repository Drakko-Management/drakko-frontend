import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'

const UPDATE_CHECK_MS = 60 * 60 * 1000

export function PwaUpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Une appli laissée ouverte (ou installée sur l'écran d'accueil) ne recherche pas
    // de mise à jour toute seule : on vérifie toutes les heures et au retour sur l'appli.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => { void registration.update().catch(() => undefined) }
      setInterval(check, UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast(t('common.update_available'), {
      duration: Infinity,
      action: {
        label: t('common.update_btn'),
        onClick: () => void updateServiceWorker(true),
      },
    })
  }, [needRefresh, t, updateServiceWorker])

  return null
}
