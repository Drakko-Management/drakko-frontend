import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/common/Pagination'
import { apiErrorMessage } from '@/lib/api-error'
import { PAGE_SIZE, useAudit } from '../hooks'
import type { AuditEntry } from '../types'

export function AuditLine({ entry }: { entry: AuditEntry }) {
  const { t, i18n } = useTranslation()
  return (
    <li className="space-y-0.5 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{t(`platform.audit_${entry.action}`)}</span>
        <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString(i18n.language)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('platform.audit_by', { actor: entry.actorName ?? t(`platform.source_${entry.source}`) })}
        {entry.organizationId && (
          <>
            {' · '}
            <Link className="underline" to={`/plateforme/organisations/${entry.organizationId}`}>
              {entry.organizationName ?? entry.organizationId}
            </Link>
          </>
        )}
        {entry.ipAddress && ` · ${entry.ipAddress}`}
      </p>
      {entry.reason && <p className="text-xs">{entry.reason}</p>}
    </li>
  )
}

// Le journal d'audit de la plateforme (ADR-028) : qui, quoi, quelle organisation, quel motif, quand, d'où
export function AuditPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useAudit(page)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('platform.audit_title')}</h1>
      {isLoading && <p className="text-sm text-muted-foreground">{t('common.searching')}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t, 'platform.load_error')}</p>}
      {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">{t('platform.audit_empty')}</p>}
      {data && data.items.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {data.items.map((entry) => (
            <AuditLine key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
      {data && <Pagination page={page} total={data.total} limit={PAGE_SIZE} onChange={setPage} />}
    </div>
  )
}
