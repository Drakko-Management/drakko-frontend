import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getIsInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// Version de Safari (« Version/26.0 »). iOS gèle le numéro d'iOS dans le user-agent
// (« iPhone OS 18_6 » sous iOS 26) : seule cette version distingue l'iOS 26 des précédents
export function parseSafariMajor(ua: string): number | null {
  const match = /Version\/(\d+)/.exec(ua)
  return match ? Number(match[1]) : null
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(getIsInstalled)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setIsInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isMobile = isIOS || isAndroid
  // Safari strict (not Chrome/Firefox on iOS which also include "Safari")
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua)
  const safariMajor = parseSafariMajor(ua)
  const canNativePrompt = !!deferredPrompt

  async function triggerInstall(): Promise<boolean> {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') setIsInstalled(true)
    return outcome === 'accepted'
  }

  return { isInstalled, isIOS, isAndroid, isMobile, isSafari, safariMajor, canNativePrompt, triggerInstall }
}
