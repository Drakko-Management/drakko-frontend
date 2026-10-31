import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { leaveSupportSession } from '@/lib/support-session'

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Bandeau toujours visible en mode dépannage (ADR-028) : qui regarde, quelle organisation, pourquoi, et combien de
 * temps il reste. Rien quand la session est ordinaire. À la fin du temps, retour automatique à la plateforme.
 */
export function SupportBanner() {
  const { t } = useTranslation()
  const support = useAuthStore((s) => s.support)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!support) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [support])

  const remaining = support ? support.expiresAt - now : 0
  useEffect(() => {
    if (support && remaining <= 0) leaveSupportSession()
  }, [support, remaining])

  if (!support) return null
  return (
    <div
      role="status"
      data-testid="support-banner"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-amber-400 px-3 py-1.5 text-xs font-medium text-amber-950"
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      <span className="font-semibold">{t('platform.support_banner_title')}</span>
      <span>{t('platform.support_banner_context', { organization: support.organizationName, user: support.viewingAs })}</span>
      <span className="min-w-0 flex-1 truncate" title={support.reason}>
        {t('platform.support_banner_reason', { reason: support.reason })}
      </span>
      <span className="tabular-nums">{t('platform.support_banner_remaining', { time: clock(remaining) })}</span>
      <button
        type="button"
        onClick={leaveSupportSession}
        className="rounded border border-amber-950/40 bg-amber-100 px-2 py-0.5 font-semibold hover:bg-white"
      >
        {t('platform.support_leave')}
      </button>
    </div>
  )
}
