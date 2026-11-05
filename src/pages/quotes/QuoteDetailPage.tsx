import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Banknote, Check, Copy, Download, Hammer, Loader2, Mail, Pencil, Receipt, RotateCcw, Send, Trash2, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDestructiveDialog } from '@/components/common/ConfirmDestructiveDialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import { useCreateInvoice, type InvoiceInput } from '@/hooks/use-invoices'
import { useDeleteQuote, useEmailQuote, useQuote, useQuoteAction, openQuotePdf, type QuoteAction } from '@/hooks/use-quotes'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage } from '@/lib/api-error'
import { formatDate, fullName } from '@/lib/utils'
import { formatMoney, formatQuantity } from '@/modules/devis/format'
import { centsOf } from '@/modules/devis/totals'
import { QuoteStatusBadge } from '@/modules/devis/QuoteStatusBadge'
import { DepositDialog } from '@/modules/factures/DepositDialog'
import { InvoiceStatusBadge } from '@/modules/factures/InvoiceStatusBadge'
import type { Quote } from '@/types/api'

export function QuoteDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: quote, isLoading, isError } = useQuote(id)
  const action = useQuoteAction()
  const deleteQuote = useDeleteQuote()
  const emailQuote = useEmailQuote()
  const createInvoice = useCreateInvoice()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  // Accepter, refuser ou annuler une décision à la main : un clic de trop se confirme avant de partir
  const [decision, setDecision] = useState<'accept' | 'reject' | 'undecide' | null>(null)
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
    } finally {
      setDecision(null)
    }
  }

  async function handleEmail() {
    try {
      await emailQuote.mutateAsync(id)
      toast.success(t('quotes.email_done', { email: quote?.client.email ?? '' }))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.email_error'))
    } finally {
      setConfirmEmail(false)
    }
  }

  async function handleCopyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('quotes.link_copied'))
    } catch {
      toast.error(t('quotes.link_copy_error'))
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

  // Un clic : le brouillon de facture naît du devis (client, lignes, objet, TVA) et s'ouvre, prêt à relire et à émettre
  async function handleCreateInvoice() {
    try {
      const invoice = await createInvoice.mutateAsync({ quoteId: id })
      toast.success(t('quotes.invoice_created'))
      void navigate(`/factures/${invoice.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.invoice_error'))
    }
  }

  // Un acompte naît comme la facture : en brouillon, qui s'ouvre pour être relu et émis
  async function handleCreateDeposit(deposit: NonNullable<InvoiceInput['deposit']>) {
    try {
      const invoice = await createInvoice.mutateAsync({ quoteId: id, deposit })
      toast.success(t('quotes.deposit_created'))
      void navigate(`/factures/${invoice.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.deposit_error'))
    } finally {
      setDepositOpen(false)
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

  const busy = action.isPending || emailQuote.isPending
  const buttonClass = 'min-h-[44px]'
  const { status } = quote
  // Une décision se défait tant que rien n'en découle : ni chantier, ni facture ou acompte, et le client n'a pas accepté
  // lui-même en ligne (le serveur reste juge)
  const decisionLocked =
    status === 'ACCEPTED' &&
    (Boolean(quote.project) || Boolean(quote.invoice) || quote.deposits.length > 0 || quote.acceptance?.state === 'ACCEPTED')
  const canUndecide = canUpdate && (status === 'REJECTED' || (status === 'ACCEPTED' && !decisionLocked))

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
        {quote.project && can('chantiers', 'read') && (
          <p className="text-sm" data-testid="quote-project">
            <span className="text-muted-foreground">{t('quotes.project_label')} : </span>
            <Link to={`/chantiers/${quote.project.id}`} className="text-primary">
              {`${quote.project.reference} · ${quote.project.title}`}
            </Link>
          </p>
        )}
        {quote.invoice && can('factures', 'read') && (
          <p className="text-sm" data-testid="quote-invoice">
            <span className="text-muted-foreground">{t('quotes.invoice_label')} : </span>
            <Link to={`/factures/${quote.invoice.id}`} className="text-primary">
              {quote.invoice.reference ?? t('invoices.draft_name')}
            </Link>
          </p>
        )}
        {quote.deposits.length > 0 && can('factures', 'read') && (
          <div className="text-sm" data-testid="quote-deposits">
            <span className="text-muted-foreground">{t('quotes.deposits_label')} :</span>
            <ul className="mt-1 space-y-1">
              {quote.deposits.map((deposit) => (
                <li key={deposit.id} className="flex flex-wrap items-center gap-2" data-testid="quote-deposit">
                  <Link to={`/factures/${deposit.id}`} className="text-primary">
                    {deposit.reference ?? t('invoices.draft_name')}
                  </Link>
                  <span>{formatMoney(deposit.total)}</span>
                  <InvoiceStatusBadge invoice={{ kind: 'INVOICE', status: deposit.status, overdue: false }} />
                </li>
              ))}
            </ul>
          </div>
        )}
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
        {quote.vatExempt ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground" data-testid="quote-vat-exempt">
              {t('quotes.vat_exempt_note')}
            </dt>
          </div>
        ) : (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('quotes.vat', { rate: parseFloat(quote.vatRate) })}</dt>
            <dd>{formatMoney(quote.vatAmount)}</dd>
          </div>
        )}
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

      <AcceptanceInfo quote={quote} />

      {decisionLocked && canUpdate && (
        <p className="text-xs text-muted-foreground" data-testid="quote-decision-locked">
          {t('quotes.hint_decision_locked')}
        </p>
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
            <Button type="button" className={buttonClass} disabled={busy} onClick={() => setConfirmEmail(true)}>
              <Mail className="h-4 w-4" />
              {t('quotes.action_email')}
            </Button>
            <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => void run('send')}>
              <Send className="h-4 w-4" />
              {t('quotes.action_send')}
            </Button>
          </>
        )}

        {status === 'SENT' && canUpdate && (
          <>
            <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => setConfirmEmail(true)}>
              <Mail className="h-4 w-4" />
              {t('quotes.action_email_again')}
            </Button>
            {quote.acceptance?.url && (
              <Button type="button" variant="outline" className={buttonClass} onClick={() => void handleCopyLink(quote.acceptance?.url ?? '')}>
                <Copy className="h-4 w-4" />
                {t('quotes.action_copy_link')}
              </Button>
            )}
            <Button type="button" className={buttonClass} disabled={busy} onClick={() => setDecision('accept')}>
              <Check className="h-4 w-4" />
              {t('quotes.action_accept')}
            </Button>
            <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => setDecision('reject')}>
              <X className="h-4 w-4" />
              {t('quotes.action_reject')}
            </Button>
            <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => void run('reopen')}>
              <RotateCcw className="h-4 w-4" />
              {t('quotes.action_reopen')}
            </Button>
          </>
        )}

        {status === 'ACCEPTED' && !quote.project && can('chantiers', 'create') && (
          <Button type="button" className={buttonClass} onClick={() => void navigate(`/chantiers/nouveau?devis=${id}`)}>
            <Hammer className="h-4 w-4" />
            {t('quotes.action_create_project')}
          </Button>
        )}

        {status === 'ACCEPTED' && !quote.invoice && can('factures', 'create') && (
          <>
            <Button type="button" className={buttonClass} disabled={createInvoice.isPending} onClick={() => void handleCreateInvoice()}>
              {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {t(quote.deposits.length > 0 ? 'quotes.action_create_balance_invoice' : 'quotes.action_create_invoice')}
            </Button>
            <Button type="button" variant="outline" className={buttonClass} disabled={createInvoice.isPending} onClick={() => setDepositOpen(true)}>
              <Banknote className="h-4 w-4" />
              {t('quotes.action_create_deposit')}
            </Button>
          </>
        )}

        {canUndecide && (
          <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => setDecision('undecide')}>
            <Undo2 className="h-4 w-4" />
            {t('quotes.action_undecide')}
          </Button>
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

      <ConfirmDialog
        open={confirmEmail}
        onOpenChange={setConfirmEmail}
        title={t(status === 'DRAFT' ? 'quotes.email_title' : 'quotes.email_again_title')}
        description={t(status === 'DRAFT' ? 'quotes.email_description' : 'quotes.email_again_description', {
          reference: quote.reference,
          email: quote.client.email,
        })}
        confirmLabel={t('quotes.email_confirm')}
        pending={emailQuote.isPending}
        onConfirm={() => void handleEmail()}
      />

      <ConfirmDialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={t(`quotes.${decision ?? 'accept'}_title`)}
        description={t(`quotes.${decision ?? 'accept'}_description`, { reference: quote.reference })}
        confirmLabel={t(`quotes.${decision ?? 'accept'}_confirm`)}
        pending={action.isPending}
        onConfirm={() => decision && void run(decision)}
      />

      <DepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        quoteReference={quote.reference}
        quoteSubtotal={centsOf(quote.subtotal)}
        vatRate={quote.vatRate}
        vatExempt={quote.vatExempt}
        pending={createInvoice.isPending}
        onConfirm={(deposit) => void handleCreateDeposit(deposit)}
      />

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

// Où en est la réponse en ligne du client : envoyé, accepté, refusé, lien périmé ou retiré (ADR-031)
function AcceptanceInfo({ quote }: { quote: Quote }) {
  const { t } = useTranslation()
  const a = quote.acceptance
  if (!a) return null
  // Le dernier jour de validité, pas le minuit qui le suit (la date du lien)
  const until = quote.validUntil ?? a.expiresAt
  const email = a.sentTo ?? ''

  let text: string | null = null
  if (a.state === 'OPEN') text = t('quotes.acceptance_open', { email, date: formatDate(a.sentAt), until: formatDate(until) })
  else if (a.state === 'ACCEPTED') text = t('quotes.acceptance_accepted', { name: a.signerName ?? '', date: formatDate(a.respondedAt) })
  else if (a.state === 'REJECTED') text = t('quotes.acceptance_rejected', { date: formatDate(a.respondedAt) })
  else if (a.state === 'EXPIRED') text = t('quotes.acceptance_expired', { email, date: formatDate(until) })
  // Un devis décidé à la main a déjà sa ligne de date : seul un brouillon rouvert doit dire que le lien est mort
  else if (quote.status === 'DRAFT') text = t('quotes.acceptance_withdrawn')
  if (!text) return null

  return (
    <section className="space-y-1 rounded-xl border bg-card p-4" aria-label={t('quotes.acceptance_title')} data-testid="quote-acceptance">
      <h2 className="text-sm font-semibold">{t('quotes.acceptance_title')}</h2>
      <p className="text-sm text-muted-foreground">{text}</p>
      {a.comment && (
        <p className="text-sm italic text-muted-foreground">
          {t('quotes.acceptance_comment')} « {a.comment} »
        </p>
      )}
    </section>
  )
}
