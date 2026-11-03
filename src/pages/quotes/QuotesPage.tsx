import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FileText, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Fab } from '@/components/common/Fab'
import { useQuotes } from '@/hooks/use-quotes'
import { usePermissions } from '@/hooks/use-permissions'
import { cn, formatDate, fullName } from '@/lib/utils'
import { formatMoney } from '@/modules/devis/format'
import { QuoteStatusBadge } from '@/modules/devis/QuoteStatusBadge'
import type { QuoteStatus } from '@/types/api'

const FILTERS: (QuoteStatus | 'ALL')[] = ['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']

const isStatus = (value: string | null): value is QuoteStatus =>
  value === 'DRAFT' || value === 'SENT' || value === 'ACCEPTED' || value === 'REJECTED'

export function QuotesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  // L'état choisi vit dans l'adresse (?status=SENT) : le tableau de bord y renvoie, et le retour arrière le retrouve
  const fromUrl = searchParams.get('status')
  const status: QuoteStatus | 'ALL' = isStatus(fromUrl) ? fromUrl : 'ALL'
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: quotes, isLoading } = useQuotes({
    status: status === 'ALL' ? undefined : status,
    q: debounced || undefined,
  })

  const canCreate = can('devis', 'create')
  const filtered = status !== 'ALL' || debounced !== ''

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('quotes.title')}</h1>
        {canCreate && (
          <Button className="hidden min-h-[44px] md:flex" onClick={() => void navigate('/devis/nouveau')}>
            <Plus className="mr-1 h-4 w-4" />
            {t('quotes.new')}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="min-h-[44px] pl-9"
          placeholder={t('quotes.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('quotes.filter_label')}>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={status === filter}
            onClick={() => setSearchParams(filter === 'ALL' ? {} : { status: filter }, { replace: true })}
            className={cn(
              'min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm transition-colors',
              status === filter ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
            )}
          >
            {filter === 'ALL' ? t('quotes.filter_all') : t(`quotes.status_${filter}`)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[84px] rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && quotes?.length === 0 && (
        <EmptyState
          icon={FileText}
          title={filtered ? t('quotes.empty_filtered') : t('quotes.empty_title')}
          description={filtered ? undefined : t('quotes.empty_desc')}
          action={
            canCreate && !filtered ? { label: t('quotes.new'), onClick: () => void navigate('/devis/nouveau') } : undefined
          }
        />
      )}

      <ul className="space-y-2">
        {quotes?.map((quote) => (
          <li key={quote.id}>
            <button
              type="button"
              onClick={() => void navigate(`/devis/${quote.id}`)}
              className="flex min-h-[84px] w-full flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-semibold">{quote.title || quote.reference}</p>
                <QuoteStatusBadge status={quote.status} />
              </div>
              {/* Sans objet, le numéro fait le titre : on ne le répète pas dessous */}
              <p className="truncate text-xs text-muted-foreground">
                {quote.title ? `${quote.reference} · ${fullName(quote.client)}` : fullName(quote.client)}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{formatDate(quote.sentAt ?? quote.createdAt)}</p>
                <p className="text-sm font-semibold">{formatMoney(quote.total)}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {canCreate && <Fab onClick={() => void navigate('/devis/nouveau')} />}
    </div>
  )
}
