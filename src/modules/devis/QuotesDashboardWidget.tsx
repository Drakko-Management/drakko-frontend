import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FilePen, Send, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuotesSummary } from '@/hooks/use-quotes'
import { fullName } from '@/lib/utils'
import type { Quote, QuoteStatus } from '@/types/api'
import { formatMoney } from './format'
import { QuoteStatusBadge } from './QuoteStatusBadge'

const STATS: { status: QuoteStatus; icon: React.ElementType; color: string; labelKey: string }[] = [
  { status: 'DRAFT', icon: FilePen, color: 'bg-gray-100 text-gray-700', labelKey: 'quotes.stat_draft' },
  { status: 'SENT', icon: Send, color: 'bg-blue-50 text-blue-700', labelKey: 'quotes.stat_sent' },
  { status: 'ACCEPTED', icon: CheckCircle, color: 'bg-green-50 text-green-700', labelKey: 'quotes.stat_accepted' },
]

function QuoteRow({ quote, onClick }: { quote: Quote; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{quote.title || quote.reference}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {quote.title ? `${quote.reference} · ${fullName(quote.client)}` : fullName(quote.client)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{formatMoney(quote.total)}</p>
          <QuoteStatusBadge status={quote.status} />
        </div>
      </div>
    </button>
  )
}

/**
 * Le bloc Devis du tableau de bord (ADR-027) : combien de brouillons, d'envoyés et d'acceptés, puis les devis récents.
 * Les comptes viennent de la synthèse du serveur, pas de la liste (limitée à 200). Il n'est monté que si l'utilisateur
 * peut lire les devis : il ne revérifie pas ce droit.
 */
export function QuotesDashboardWidget() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: summary, isLoading } = useQuotesSummary()
  const quotes = summary?.recent

  const count = (status: QuoteStatus) =>
    status === 'DRAFT' ? (summary?.drafts ?? 0) : status === 'SENT' ? (summary?.sent ?? 0) : (summary?.accepted ?? 0)

  return (
    <section className="space-y-3" aria-label={t('nav.quotes')}>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {STATS.map(({ status, icon: Icon, color, labelKey }) => (
          <button
            key={status}
            type="button"
            onClick={() => void navigate(`/devis?status=${status}`)}
            className="flex w-full flex-col items-center gap-1 rounded-xl border bg-card p-2.5 transition-colors active:bg-muted sm:flex-row sm:gap-3 sm:p-4"
          >
            <div className={`rounded-xl p-1.5 sm:p-2.5 ${color}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-center sm:text-left">
              {isLoading ? (
                <Skeleton className="mb-1 h-5 w-6 sm:h-6 sm:w-8" />
              ) : (
                <p className="text-lg font-bold leading-none sm:text-2xl">{count(status)}</p>
              )}
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{t(labelKey)}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('quotes.recent')}</h2>
        <button
          type="button"
          className="text-sm text-primary"
          onClick={() => void navigate('/devis')}
        >
          {t('dashboard.see_all')}
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      ) : quotes && quotes.length > 0 ? (
        <div className="grid gap-2 lg:grid-cols-2">
          {quotes.map((quote) => (
            <QuoteRow key={quote.id} quote={quote} onClick={() => void navigate(`/devis/${quote.id}`)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('quotes.none')}</p>
      )}
    </section>
  )
}
