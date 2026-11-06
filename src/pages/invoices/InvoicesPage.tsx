import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Download, Plus, Receipt, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Fab } from '@/components/common/Fab'
import { downloadInvoicesExport, useInvoices, type InvoiceFilters } from '@/hooks/use-invoices'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage } from '@/lib/api-error'
import { cn, formatDate, fullName } from '@/lib/utils'
import { formatMoney } from '@/modules/devis/format'
import { formatDay } from '@/modules/factures/format'
import { ExportInvoicesDialog } from '@/modules/factures/ExportInvoicesDialog'
import { InvoiceStatusBadge } from '@/modules/factures/InvoiceStatusBadge'

// Les factures se chargent par 50 ; « Afficher plus » en demande 50 de plus (la liste ne s'arrête jamais en silence)
const PAGE_SIZE = 50

type Filter = 'ALL' | 'DRAFT' | 'ISSUED' | 'OVERDUE' | 'PAID' | 'CANCELLED' | 'CREDIT_NOTE'

const FILTERS: Filter[] = ['ALL', 'DRAFT', 'ISSUED', 'OVERDUE', 'PAID', 'CANCELLED', 'CREDIT_NOTE']

/**
 * Ce que chaque onglet demande à l'API. « À encaisser » ne compte pas les avoirs, qui n'attendent aucun paiement.
 * « Annulées » : les factures annulées par un avoir (l'avoir, lui, est dans « Avoirs »).
 */
const QUERY: Record<Filter, InvoiceFilters> = {
  ALL: {},
  DRAFT: { status: 'DRAFT' },
  ISSUED: { status: 'ISSUED', kind: 'INVOICE' },
  OVERDUE: { overdue: true },
  PAID: { status: 'PAID' },
  CANCELLED: { status: 'CANCELLED' },
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
  // L'export comptable : la fenêtre du choix de période, et le fichier en préparation
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleExport({ from, to }: { from: string; to: string }) {
    setExporting(true)
    try {
      await downloadInvoicesExport(from, to)
      toast.success(t('invoices.export_done'))
      setExportOpen(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.export_error'))
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Combien de factures demandées : il repart de 50 dès que l'onglet ou la recherche change
  const filterKey = `${filter}|${debounced}`
  const [asked, setAsked] = useState({ filterKey, limit: PAGE_SIZE })
  const limit = asked.filterKey === filterKey ? asked.limit : PAGE_SIZE

  const { data: invoices, isLoading } = useInvoices({ ...QUERY[filter], q: debounced || undefined, limit })
  // Autant que demandé : il y en a peut-être d'autres
  const hasMore = (invoices?.length ?? 0) >= limit

  const canCreate = can('factures', 'create')
  const filtered = filter !== 'ALL' || debounced !== ''

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('invoices.title')}</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setExportOpen(true)}>
            <Download className="mr-1 h-4 w-4" />
            {t('invoices.export')}
          </Button>
          {canCreate && (
            <Button className="hidden min-h-[44px] md:flex" onClick={() => void navigate('/factures/nouveau')}>
              <Plus className="mr-1 h-4 w-4" />
              {t('invoices.new')}
            </Button>
          )}
        </div>
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

      {hasMore && (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={() => setAsked({ filterKey, limit: limit + PAGE_SIZE })}
        >
          {t('common.show_more')}
        </Button>
      )}

      {canCreate && <Fab onClick={() => void navigate('/factures/nouveau')} />}

      <ExportInvoicesDialog open={exportOpen} onOpenChange={setExportOpen} pending={exporting} onConfirm={(period) => void handleExport(period)} />
    </div>
  )
}
