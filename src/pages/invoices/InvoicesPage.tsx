import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Receipt, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Fab } from '@/components/common/Fab'
import { useInvoices, type InvoiceFilters } from '@/hooks/use-invoices'
import { usePermissions } from '@/hooks/use-permissions'
import { cn, formatDate, fullName } from '@/lib/utils'
import { formatMoney } from '@/modules/devis/format'
import { formatDay } from '@/modules/factures/format'
import { InvoiceStatusBadge } from '@/modules/factures/InvoiceStatusBadge'

type Filter = 'ALL' | 'DRAFT' | 'ISSUED' | 'OVERDUE' | 'PAID' | 'CREDIT_NOTE'

const FILTERS: Filter[] = ['ALL', 'DRAFT', 'ISSUED', 'OVERDUE', 'PAID', 'CREDIT_NOTE']

/** Ce que chaque onglet demande à l'API. « À encaisser » ne compte pas les avoirs, qui n'attendent aucun paiement. */
const QUERY: Record<Filter, InvoiceFilters> = {
  ALL: {},
  DRAFT: { status: 'DRAFT' },
  ISSUED: { status: 'ISSUED', kind: 'INVOICE' },
  OVERDUE: { overdue: true },
  PAID: { status: 'PAID' },
  CREDIT_NOTE: { kind: 'CREDIT_NOTE' },
}

const isFilter = (value: string | null): value is Filter => FILTERS.includes(value as Filter)

export function InvoicesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  // L'onglet choisi vit dans l'adresse (?filter=OVERDUE) : le tableau de bord y renvoie, et le retour arrière le retrouve
  const fromUrl = searchParams.get('filter')
  const filter: Filter = isFilter(fromUrl) ? fromUrl : 'ALL'
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: invoices, isLoading } = useInvoices({ ...QUERY[filter], q: debounced || undefined })

  const canCreate = can('factures', 'create')
  const filtered = filter !== 'ALL' || debounced !== ''

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('invoices.title')}</h1>
        {canCreate && (
          <Button className="hidden min-h-[44px] md:flex" onClick={() => void navigate('/factures/nouveau')}>
            <Plus className="mr-1 h-4 w-4" />
            {t('invoices.new')}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="min-h-[44px] pl-9"
          placeholder={t('invoices.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('invoices.filter_label')}>
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            onClick={() => setSearchParams(item === 'ALL' ? {} : { filter: item }, { replace: true })}
            className={cn(
              'min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm transition-colors',
              filter === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
            )}
          >
            {t(`invoices.filter_${item}`)}
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

      {!isLoading && invoices?.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={filtered ? t('invoices.empty_filtered') : t('invoices.empty_title')}
          description={filtered ? undefined : t('invoices.empty_desc')}
          action={
            canCreate && !filtered ? { label: t('invoices.new'), onClick: () => void navigate('/factures/nouveau') } : undefined
          }
        />
      )}

      <ul className="space-y-2">
        {invoices?.map((invoice) => {
          const name = invoice.reference ?? t('invoices.draft_name')
          return (
            <li key={invoice.id}>
              <button
                type="button"
                onClick={() => void navigate(`/factures/${invoice.id}`)}
                className="flex min-h-[84px] w-full flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{invoice.title || name}</p>
                  <InvoiceStatusBadge invoice={invoice} />
                </div>
                {/* Sans objet, le numéro fait le titre : on ne le répète pas dessous */}
                <p className="truncate text-xs text-muted-foreground">
                  {invoice.title ? `${name} · ${fullName(invoice.client)}` : fullName(invoice.client)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {invoice.overdue && invoice.dueDate
                      ? t('invoices.due_on', { date: formatDay(invoice.dueDate) })
                      : invoice.issueDate
                        ? formatDay(invoice.issueDate)
                        : formatDate(invoice.createdAt)}
                  </p>
                  <p className="text-sm font-semibold">{formatMoney(invoice.total)}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {canCreate && <Fab onClick={() => void navigate('/factures/nouveau')} />}
    </div>
  )
}
