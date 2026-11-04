import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types/api'

type BadgeKey = 'DRAFT' | 'ISSUED' | 'OVERDUE' | 'PAID' | 'CANCELLED' | 'CREDIT_NOTE'

const CLASSES: Record<BadgeKey, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border border-gray-200',
  ISSUED: 'bg-blue-50 text-blue-700 border border-blue-200',
  OVERDUE: 'bg-red-50 text-red-700 border border-red-200',
  PAID: 'bg-green-50 text-green-700 border border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200 line-through',
  CREDIT_NOTE: 'bg-amber-50 text-amber-700 border border-amber-200',
}

/** L'état à montrer : un avoir est un « Avoir », une facture émise en retard est « En retard ». */
function badgeKey(invoice: Pick<Invoice, 'kind' | 'status' | 'overdue'>): BadgeKey {
  if (invoice.kind === 'CREDIT_NOTE') return 'CREDIT_NOTE'
  if (invoice.status === 'ISSUED' && invoice.overdue) return 'OVERDUE'
  return invoice.status
}

export function InvoiceStatusBadge({
  invoice,
  className,
}: {
  invoice: Pick<Invoice, 'kind' | 'status' | 'overdue'>
  className?: string
}) {
  const { t } = useTranslation()
  const key = badgeKey(invoice)
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        CLASSES[key],
        className,
      )}
    >
      {t(`invoices.badge_${key}`)}
    </span>
  )
}
