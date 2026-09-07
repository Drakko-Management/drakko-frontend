import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/api'

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  DRAFT:               'bg-gray-100 text-gray-700 border border-gray-200',
  PLANNED:             'bg-blue-50 text-blue-700 border border-blue-200',
  IN_PROGRESS:         'bg-amber-50 text-amber-700 border border-amber-200',
  AWAITING_SIGNATURE:       'bg-orange-50 text-orange-700 border border-orange-200',
  AWAITING_RESERVE_LIFT:    'bg-amber-100 text-amber-800 border border-amber-300',
  COMPLETED:                'bg-green-50 text-green-700 border border-green-200',
  DISPUTED:            'bg-red-50 text-red-700 border border-red-200',
}

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  )
}
