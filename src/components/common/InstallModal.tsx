import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2, Monitor, Share, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/use-pwa-install'

interface Props {
  open: boolean
  onClose: () => void
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {number}
      </span>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}

export function InstallModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const { isIOS, isAndroid, isSafari, canNativePrompt, isInstalled, triggerInstall } = usePwaInstall()
  const [installing, setInstalling] = useState(false)

  if (!open) return null

  async function handleNativeInstall() {
    setInstalling(true)
    const accepted = await triggerInstall()
    setInstalling(false)
    if (accepted) onClose()
  }

  function renderContent() {
    if (isInstalled) {
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Smartphone className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm text-muted-foreground">{t('install.already_installed')}</p>
        </div>
      )
    }

    if (canNativePrompt) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('install.android_native_title')}</p>
          <Button
            className="w-full min-h-[48px] gap-2"
            onClick={() => void handleNativeInstall()}
            disabled={installing}
          >
            {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('install.android_native_btn')}
          </Button>
        </div>
      )
    }

    if (isIOS && isSafari) {
      return (
        <div className="space-y-4">
          <Step number={1}>
            {t('install.ios_safari_step1')}{' '}
            <Share className="mb-0.5 inline h-4 w-4 text-blue-500" />
          </Step>
          <Step number={2}>
            {t('install.ios_safari_step2')}{' '}
            <strong>« {t('install.ios_safari_step2_label')} »</strong>
          </Step>
          <Step number={3}>
            {t('install.ios_safari_step3')}{' '}
            <strong>« {t('install.ios_safari_step3_label')} »</strong>
          </Step>
        </div>
      )
    }

    if (isIOS && !isSafari) {
      return (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {t('install.ios_not_safari')}
        </div>
      )
    }

    if (isAndroid) {
      return (
        <div className="space-y-4">
          <Step number={1}>
            {t('install.android_manual_step1')}{' '}
            <strong>⋮</strong>{' '}
            {t('install.android_manual_step1b')}
          </Step>
          <Step number={2}>
            {t('install.android_manual_step2')}{' '}
            <strong>« {t('install.android_manual_step2_label')} »</strong>
          </Step>
        </div>
      )
    }

    return (
      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
        <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('install.desktop_instructions')}</p>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pt-4 pb-24 sm:p-4 sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl"
        data-tutorial="install-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t('install.modal_title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  )
}
