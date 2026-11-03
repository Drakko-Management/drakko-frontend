import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { QuoteStatus } from '@/types/api'

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border border-gray-200',
  SENT: 'bg-blue-50 text-blue-700 border border-blue-200',
  ACCEPTED: 'bg-green-50 text-green-700 border border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
}

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {t(`quotes.status_${status}`)}
    </span>
  )
}
