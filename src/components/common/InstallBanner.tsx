import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { InstallModal } from './InstallModal'

const DISMISSED_KEY = 'drakko-install-dismissed'

export function InstallBanner() {
  const { t } = useTranslation()
  const { isInstalled, isMobile } = usePwaInstall()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY))
  const [modalOpen, setModalOpen] = useState(false)

  if (!isMobile || isInstalled || dismissed) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">{t('install.banner_title')}</p>
          <p className="truncate text-xs text-muted-foreground">{t('install.banner_desc')}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          data-tutorial="install-open"
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          {t('install.install_btn')}
        </button>
        <button
          onClick={dismiss}
          aria-label={t('install.dismiss')}
          className="shrink-0 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <InstallModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
