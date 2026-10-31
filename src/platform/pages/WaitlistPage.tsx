import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/common/Pagination'
import { apiErrorMessage } from '@/lib/api-error'
import { PAGE_SIZE, useWaitlist } from '../hooks'

// Les personnes de la liste d'attente de la vitrine (ADR-020) qui ont confirmé leur adresse. « Créer son organisation »
// ouvre le formulaire de création, déjà rempli avec leur fiche.
export function WaitlistPage() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useWaitlist(page)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('platform.waitlist_title')}</h1>
      {isLoading && <p className="text-sm text-muted-foreground">{t('common.searching')}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t, 'platform.load_error')}</p>}
      {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">{t('platform.waitlist_empty')}</p>}
      {data && data.items.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {data.items.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {entry.company ?? entry.email}
                  {entry.pilotInterest && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t('platform.waitlist_pilot')}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[entry.firstName, entry.email, entry.trade && t(`platform.trade_${entry.trade}`), entry.teamSize && t(`platform.team_size_${entry.teamSize}`)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('platform.waitlist_confirmed', { date: new Date(entry.confirmedAt ?? entry.createdAt).toLocaleDateString(i18n.language) })}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/plateforme/organisations/nouvelle?liste-attente=${encodeURIComponent(entry.id)}`}>
                  {t('platform.waitlist_create')}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={page} total={data.total} limit={PAGE_SIZE} onChange={setPage} />}
    </div>
  )
}
