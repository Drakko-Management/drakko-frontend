import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { QuoteStatus } from '@/types/api'

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border border-gray-200',
  SENT: 'bg-blue-50 text-blue-700 border border-blue-200',
  ACCEPTED: 'bg-green-50 text-green-700 border border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
}

// Un devis envoyé dont la validité est passée n'est plus « envoyé » aux yeux du lecteur : il attend une décision
const EXPIRED_CLASSES = 'bg-amber-50 text-amber-800 border border-amber-200'

export function QuoteStatusBadge({
  status,
  expired = false,
  className,
}: {
  status: QuoteStatus
  /** `Quote.expired` : seul un devis envoyé peut l'être */
  expired?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const shownExpired = expired && status === 'SENT'
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        shownExpired ? EXPIRED_CLASSES : STATUS_CLASSES[status],
        className,
      )}
    >
      {t(shownExpired ? 'quotes.status_EXPIRED' : `quotes.status_${status}`)}
    </span>
  )
}
