import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Download, Loader2, Pencil, RotateCcw, Send, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDestructiveDialog } from '@/components/common/ConfirmDestructiveDialog'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import { useDeleteQuote, useQuote, useQuoteAction, openQuotePdf, type QuoteAction } from '@/hooks/use-quotes'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage } from '@/lib/api-error'
import { formatDate, fullName } from '@/lib/utils'
import { formatMoney, formatQuantity } from '@/modules/devis/format'
import { QuoteStatusBadge } from '@/modules/devis/QuoteStatusBadge'

export function QuoteDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: quote, isLoading, isError } = useQuote(id)
  const action = useQuoteAction()
  const deleteQuote = useDeleteQuote()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pdfPending, setPdfPending] = useState(false)

  if (isLoading) return <Skeleton className="h-72 rounded-xl" />

  if (isError || !quote) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('quotes.not_found')}</p>
        <Link to="/devis" className="text-sm text-primary">
          {t('quotes.back_to_list')}
        </Link>
      </div>
    )
  }

  const canUpdate = can('devis', 'update')
  const canDelete = can('devis', 'delete')

  async function run(next: QuoteAction) {
    try {
      await action.mutateAsync({ id, action: next })
      toast.success(t(`quotes.done_${next}`))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.action_error'))
    }
  }

  async function handlePdf() {
    setPdfPending(true)
    try {
      await openQuotePdf(id)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.pdf_error'))
    } finally {
      setPdfPending(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteQuote.mutateAsync(id)
      toast.success(t('quotes.deleted'))
      void navigate('/devis', { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.delete_error'))
      setConfirmDelete(false)
    }
  }

  const busy = action.isPending
  const buttonClass = 'min-h-[44px]'
  const { status } = quote

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/devis')}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <EditPageTitle kind={t('quotes.kind')} name={quote.reference} />
        <QuoteStatusBadge status={status} className="ml-auto" />
      </div>

      <section className="space-y-1 rounded-xl border bg-card p-4">
        {quote.title && <p className="font-semibold">{quote.title}</p>}
        <p className="text-sm">
          <span className="text-muted-foreground">{t('quotes.client')} : </span>
          {can('clients', 'read') ? (
            <Link to={`/clients/${quote.client.id}`} className="text-primary">
              {fullName(quote.client)}
            </Link>
          ) : (
            fullName(quote.client)
          )}
        </p>
        <p className="text-xs text-muted-foreground">{t('quotes.created_on', { date: formatDate(quote.createdAt) })}</p>
        {quote.sentAt && <p className="text-xs text-muted-foreground">{t('quotes.sent_on', { date: formatDate(quote.sentAt) })}</p>}
        {quote.decidedAt && (
          <p className="text-xs text-muted-foreground">
            {t(status === 'ACCEPTED' ? 'quotes.accepted_on' : 'quotes.rejected_on', { date: formatDate(quote.decidedAt) })}
          </p>
        )}
        {quote.validUntil && (
          <p className="text-xs text-muted-foreground">{t('quotes.valid_until', { date: formatDate(quote.validUntil) })}</p>
        )}
      </section>

      <section className="space-y-2" aria-label={t('quotes.form_lines')}>
        <h2 className="text-sm font-semibold">{t('quotes.form_lines')}</h2>
        {quote.lines.length === 0 && <p className="text-sm text-muted-foreground">{t('quotes.form_no_lines')}</p>}
        {quote.lines.map((line) => (
          <div key={line.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3" data-testid="quote-line">
            <div className="min-w-0">
              <p className="text-sm font-medium">{line.snapshotTitle}</p>
              {line.snapshotDescription && <p className="mt-0.5 text-xs text-muted-foreground">{line.snapshotDescription}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatQuantity(line.quantity)}
                {line.snapshotUnit ? ` ${line.snapshotUnit}` : ''} × {formatMoney(line.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold">{formatMoney(line.total)}</p>
          </div>
        ))}
      </section>

      <dl className="space-y-1 rounded-xl border bg-card p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('quotes.subtotal')}</dt>
          <dd>{formatMoney(quote.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('quotes.vat', { rate: parseFloat(quote.vatRate) })}</dt>
          <dd>{formatMoney(quote.vatAmount)}</dd>
        </div>
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <dt>{t('quotes.total')}</dt>
          <dd data-testid="quote-total">{formatMoney(quote.total)}</dd>
        </div>
      </dl>

      {quote.comment && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold">{t('quotes.form_comment')}</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{quote.comment}</p>
        </section>
      )}

      {status === 'DRAFT' && canUpdate && <p className="text-xs text-muted-foreground">{t('quotes.hint_draft')}</p>}
      {status === 'SENT' && canUpdate && <p className="text-xs text-muted-foreground">{t('quotes.hint_sent')}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={buttonClass} disabled={pdfPending} onClick={() => void handlePdf()}>
          {pdfPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t('quotes.action_pdf')}
        </Button>

        {status === 'DRAFT' && canUpdate && (
          <>
            <Button type="button" variant="outline" className={buttonClass} onClick={() => void navigate(`/devis/${id}/modifier`)}>
              <Pencil className="h-4 w-4" />
              {t('quotes.action_edit')}
            </Button>
            <Button type="button" className={buttonClass} disabled={busy} onClick={() => void run('send')}>
              <Send className="h-4 w-4" />
              {t('quotes.action_send')}
            </Button>
          </>
        )}

        {status === 'SENT' && canUpdate && (
          <>
            <Button type="button" className={buttonClass} disabled={busy} onClick={() => void run('accept')}>
              <Check className="h-4 w-4" />
              {t('quotes.action_accept')}
            </Button>
            <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => void run('reject')}>
              <X className="h-4 w-4" />
              {t('quotes.action_reject')}
            </Button>
            <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => void run('reopen')}>
              <RotateCcw className="h-4 w-4" />
              {t('quotes.action_reopen')}
            </Button>
          </>
        )}

        {status === 'DRAFT' && canDelete && (
          <Button
            type="button"
            variant="outline"
            className={`${buttonClass} text-destructive`}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            {t('quotes.action_delete')}
          </Button>
        )}
      </div>

      <ConfirmDestructiveDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('quotes.delete_title')}
        description={t('quotes.delete_description', { reference: quote.reference })}
        confirmLabel={t('quotes.action_delete')}
        pending={deleteQuote.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
