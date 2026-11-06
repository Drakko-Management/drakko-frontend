import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AlertCircle, FilePen, Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoicesSummary } from '@/hooks/use-invoices'
import { clientName } from '@/lib/utils'
import { formatMoney } from '@/modules/devis/format'
import type { Invoice } from '@/types/api'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'

type StatKey = 'DRAFT' | 'ISSUED' | 'OVERDUE'

const STATS: { key: StatKey; icon: React.ElementType; color: string; labelKey: string }[] = [
  { key: 'DRAFT', icon: FilePen, color: 'bg-gray-100 text-gray-700', labelKey: 'invoices.stat_draft' },
  { key: 'ISSUED', icon: Wallet, color: 'bg-blue-50 text-blue-700', labelKey: 'invoices.stat_to_collect' },
  { key: 'OVERDUE', icon: AlertCircle, color: 'bg-red-50 text-red-700', labelKey: 'invoices.stat_overdue' },
]

function InvoiceRow({ invoice, onClick }: { invoice: Invoice; onClick: () => void }) {
  const { t } = useTranslation()
  const name = invoice.reference ?? t('invoices.draft_name')
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{invoice.title || name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {invoice.title ? `${name} · ${clientName(invoice.client)}` : clientName(invoice.client)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{formatMoney(invoice.total)}</p>
          <InvoiceStatusBadge invoice={invoice} />
        </div>
      </div>
    </button>
  )
}

/**
 * Le bloc Factures du tableau de bord (ADR-027, ADR-033) : brouillons, factures à encaisser (avec leur montant) et en
 * retard, puis les factures récentes. Les comptes viennent de la synthèse du serveur, pas de la liste (limitée à 200) : une
 * vieille facture en retard compte même quand l'organisation en a des centaines. Il n'est monté que si l'utilisateur peut
 * lire les factures.
 */
export function InvoicesDashboardWidget() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: summary, isLoading } = useInvoicesSummary()
  const invoices = summary?.recent

  const counts: Record<StatKey, number> = {
    DRAFT: summary?.drafts ?? 0,
    ISSUED: summary?.toCollect ?? 0,
    OVERDUE: summary?.overdue ?? 0,
  }

  return (
    <section className="space-y-3" aria-label={t('nav.invoices')}>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {STATS.map(({ key, icon: Icon, color, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => void navigate(`/factures?filter=${key}`)}
            className="flex w-full flex-col items-center gap-1 rounded-xl border bg-card p-2.5 transition-colors active:bg-muted sm:flex-row sm:gap-3 sm:p-4"
          >
            <div className={`rounded-xl p-1.5 sm:p-2.5 ${color}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-center sm:text-left">
              {isLoading ? (
                <Skeleton className="mb-1 h-5 w-6 sm:h-6 sm:w-8" />
              ) : (
                <p className="text-lg font-bold leading-none sm:text-2xl">{counts[key]}</p>
              )}
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{t(labelKey)}</p>
            </div>
          </button>
        ))}
      </div>

      {!isLoading && counts.ISSUED > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="invoices-to-collect">
          {t('invoices.to_collect_total', { amount: formatMoney(summary?.toCollectTotal) })}
        </p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('invoices.recent')}</h2>
        <button type="button" className="text-sm text-primary" onClick={() => void navigate('/factures')}>
          {t('dashboard.see_all')}
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      ) : invoices && invoices.length > 0 ? (
        <div className="grid gap-2 lg:grid-cols-2">
          {invoices.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} onClick={() => void navigate(`/factures/${invoice.id}`)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('invoices.none')}</p>
      )}
    </section>
  )
}
