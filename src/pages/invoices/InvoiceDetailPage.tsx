import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Ban, Banknote, Download, FileCheck2, Loader2, Mail, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDestructiveDialog } from '@/components/common/ConfirmDestructiveDialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import {
  openInvoicePdf,
  useCreditNote,
  useDeleteInvoice,
  useEmailInvoice,
  useInvoice,
  useIssueInvoice,
  usePayInvoice,
  useUnpayInvoice,
  type PayInput,
} from '@/hooks/use-invoices'
import { useOrganization } from '@/hooks/use-organization'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage } from '@/lib/api-error'
import { formatDate, fullName } from '@/lib/utils'
import { formatMoney, formatQuantity } from '@/modules/devis/format'
import { centsOf, centsToNumber } from '@/modules/devis/totals'
import { formatDay } from '@/modules/factures/format'
import { missingIdentity } from '@/modules/factures/identity'
import { InvoiceStatusBadge } from '@/modules/factures/InvoiceStatusBadge'
import { PayInvoiceDialog } from '@/modules/factures/PayInvoiceDialog'
import { paymentDays } from '@/modules/factures/payment-terms'

type Dialog = 'issue' | 'identity' | 'email' | 'pay' | 'unpay' | 'credit' | 'delete' | null

export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: invoice, isLoading, isError } = useInvoice(id)
  const { data: org } = useOrganization()
  const issue = useIssueInvoice()
  const emailInvoice = useEmailInvoice()
  const pay = usePayInvoice()
  const unpay = useUnpayInvoice()
  const creditNote = useCreditNote()
  const deleteInvoice = useDeleteInvoice()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [pdfPending, setPdfPending] = useState(false)

  if (isLoading) return <Skeleton className="h-72 rounded-xl" />

  if (isError || !invoice) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('invoices.not_found')}</p>
        <Link to="/factures" className="text-sm text-primary">
          {t('invoices.back_to_list')}
        </Link>
      </div>
    )
  }

  const { status, kind } = invoice
  const isCreditNote = kind === 'CREDIT_NOTE'
  const canUpdate = can('factures', 'update')
  const canCreate = can('factures', 'create')
  const canDelete = can('factures', 'delete')
  const missing = missingIdentity(org, invoice.vatExempt)
  // Les réglages n'ont aucune pénalité de retard : la facture partira sans (on le dit avant d'émettre)
  const noPenalties = !!org && !org.latePaymentPenalties?.trim()
  const name = invoice.reference ?? t('invoices.draft_name')
  // Sur une facture de solde, les lignes qui déduisent un acompte ne sont pas des prestations : elles se lisent dans les totaux
  const works = invoice.lines.filter((line) => !line.depositInvoiceId)
  const deductions = invoice.lines.filter((line) => line.depositInvoiceId)
  const worksSubtotal = works.reduce((sum, line) => sum + centsOf(line.total), 0n)
  const kindKey = isCreditNote ? 'invoices.kind_credit_note' : invoice.deposit ? 'invoices.kind_deposit' : 'invoices.kind'
  const buttonClass = 'min-h-[44px]'
  const busy = issue.isPending || emailInvoice.isPending || pay.isPending || unpay.isPending || creditNote.isPending
  // Seule une facture émise ou payée part (pas un brouillon sans numéro, pas une facture annulée : son avoir la remplace)
  const canEmail = canUpdate && (status === 'ISSUED' || status === 'PAID')

  async function handleEmail() {
    try {
      await emailInvoice.mutateAsync(id)
      toast.success(t('invoices.email_done', { email: invoice?.client.email ?? '' }))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.email_error'))
    } finally {
      setDialog(null)
    }
  }

  async function handleIssue() {
    try {
      await issue.mutateAsync(id)
      toast.success(t('invoices.done_issue'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.action_error'))
    } finally {
      setDialog(null)
    }
  }

  async function handlePay(input: PayInput) {
    try {
      await pay.mutateAsync({ id, ...input })
      toast.success(t('invoices.done_pay'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.action_error'))
    } finally {
      setDialog(null)
    }
  }

  async function handleUnpay() {
    try {
      await unpay.mutateAsync(id)
      toast.success(t('invoices.done_unpay'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.action_error'))
    } finally {
      setDialog(null)
    }
  }

  async function handleCredit() {
    try {
      const credit = await creditNote.mutateAsync(id)
      toast.success(t('invoices.done_credit', { reference: credit.reference ?? '' }))
      void navigate(`/factures/${credit.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.action_error'))
    } finally {
      setDialog(null)
    }
  }

  async function handleDelete() {
    try {
      await deleteInvoice.mutateAsync(id)
      toast.success(t('invoices.deleted'))
      void navigate('/factures', { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.delete_error'))
      setDialog(null)
    }
  }

  async function handlePdf() {
    setPdfPending(true)
    try {
      await openInvoicePdf(id)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.pdf_error'))
    } finally {
      setPdfPending(false)
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/factures')}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <EditPageTitle kind={t(kindKey)} name={name} />
        <InvoiceStatusBadge invoice={invoice} className="ml-auto" />
      </div>

      <section className="space-y-1 rounded-xl border bg-card p-4">
        {invoice.title && <p className="font-semibold">{invoice.title}</p>}
        <p className="text-sm">
          <span className="text-muted-foreground">{t('quotes.client')} : </span>
          {can('clients', 'read') ? (
            <Link to={`/clients/${invoice.client.id}`} className="text-primary">
              {fullName(invoice.client)}
            </Link>
          ) : (
            fullName(invoice.client)
          )}
        </p>
        {invoice.quote && can('devis', 'read') && (
          <p className="text-sm" data-testid="invoice-quote">
            <span className="text-muted-foreground">{t('invoices.quote_label')} : </span>
            <Link to={`/devis/${invoice.quote.id}`} className="text-primary">
              {invoice.quote.reference}
            </Link>
          </p>
        )}
        {invoice.creditedInvoice && (
          <p className="text-sm" data-testid="invoice-credited">
            <span className="text-muted-foreground">{t('invoices.credited_label')} : </span>
            <Link to={`/factures/${invoice.creditedInvoice.id}`} className="text-primary">
              {invoice.creditedInvoice.reference}
            </Link>
          </p>
        )}
        {invoice.creditNote && (
          <p className="text-sm" data-testid="invoice-credit-note">
            <span className="text-muted-foreground">{t('invoices.credit_note_label')} : </span>
            <Link to={`/factures/${invoice.creditNote.id}`} className="text-primary">
              {invoice.creditNote.reference}
            </Link>
          </p>
        )}
        {invoice.deductedBy && (
          <p className="text-sm" data-testid="invoice-deducted-by">
            <span className="text-muted-foreground">{t('invoices.deducted_by_label')} : </span>
            <Link to={`/factures/${invoice.deductedBy.id}`} className="text-primary">
              {invoice.deductedBy.reference ?? t('invoices.draft_name')}
            </Link>
          </p>
        )}
        {status === 'DRAFT' ? (
          <p className="text-xs text-muted-foreground">{t('invoices.created_on', { date: formatDate(invoice.createdAt) })}</p>
        ) : (
          invoice.issueDate && (
            <p className="text-xs text-muted-foreground">{t('invoices.issued_on', { date: formatDay(invoice.issueDate) })}</p>
          )
        )}
        {invoice.serviceDate && !isCreditNote && !invoice.deposit && (
          <p className="text-xs text-muted-foreground" data-testid="invoice-service-date">
            {t('invoices.service_on', { date: formatDay(invoice.serviceDate) })}
          </p>
        )}
        {invoice.dueDate && !isCreditNote && (
          <p
            className={invoice.overdue ? 'text-xs font-medium text-red-700' : 'text-xs text-muted-foreground'}
            data-testid="invoice-due"
          >
            {t(invoice.overdue ? 'invoices.overdue_since' : 'invoices.due_on', { date: formatDay(invoice.dueDate) })}
          </p>
        )}
        {invoice.emailedAt && invoice.emailedTo && (
          <p className="text-xs text-muted-foreground" data-testid="invoice-emailed">
            {t('invoices.emailed_on', { email: invoice.emailedTo, date: formatDate(invoice.emailedAt) })}
          </p>
        )}
        {invoice.paidAt && (
          <p className="text-xs text-muted-foreground" data-testid="invoice-paid">
            {invoice.paymentMethod
              ? t('invoices.paid_on_by', { date: formatDay(invoice.paidAt), method: t(`invoices.method_${invoice.paymentMethod}`) })
              : t('invoices.paid_on', { date: formatDay(invoice.paidAt) })}
          </p>
        )}
      </section>

      <section className="space-y-2" aria-label={t('quotes.form_lines')}>
        <h2 className="text-sm font-semibold">{t('quotes.form_lines')}</h2>
        {works.length === 0 && <p className="text-sm text-muted-foreground">{t('quotes.form_no_lines')}</p>}
        {works.map((line) => (
          <div key={line.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3" data-testid="invoice-line">
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
        {deductions.length > 0 && (
          <>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('invoices.works_total')}</dt>
              <dd data-testid="invoice-works-total">{formatMoney(centsToNumber(worksSubtotal))}</dd>
            </div>
            {deductions.map((line) => (
              <div key={line.id} className="flex justify-between" data-testid="invoice-deduction">
                <dt>
                  <Link to={`/factures/${line.depositInvoiceId}`} className="text-primary">
                    {t('invoices.deposit_deducted', { reference: line.snapshotTitle })}
                  </Link>
                </dt>
                <dd>{formatMoney(line.total)}</dd>
              </div>
            ))}
          </>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('quotes.subtotal')}</dt>
          <dd>{formatMoney(invoice.subtotal)}</dd>
        </div>
        {invoice.vatExempt ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground" data-testid="invoice-vat-exempt">
              {t('quotes.vat_exempt_note')}
            </dt>
          </div>
        ) : (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('quotes.vat', { rate: parseFloat(invoice.vatRate) })}</dt>
            <dd>{formatMoney(invoice.vatAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <dt>{t(deductions.length > 0 ? 'invoices.balance_due' : 'quotes.total')}</dt>
          <dd data-testid="invoice-total">{formatMoney(invoice.total)}</dd>
        </div>
      </dl>

      {invoice.comment && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold">{t('quotes.form_comment')}</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{invoice.comment}</p>
        </section>
      )}

      {status === 'DRAFT' && canUpdate && (
        <p className="text-xs text-muted-foreground">{t(invoice.deposit ? 'invoices.hint_deposit_draft' : 'invoices.hint_draft')}</p>
      )}
      {status === 'ISSUED' && !isCreditNote && canCreate && (
        <p className="text-xs text-muted-foreground" data-testid="invoice-hint-issued">
          {t(invoice.deductedBy ? 'invoices.hint_deposit_deducted' : 'invoices.hint_issued')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={buttonClass} disabled={pdfPending} onClick={() => void handlePdf()}>
          {pdfPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t('invoices.action_pdf')}
        </Button>

        {canEmail && (
          <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => setDialog('email')}>
            <Mail className="h-4 w-4" />
            {t(invoice.emailedAt ? 'invoices.action_email_again' : 'invoices.action_email')}
          </Button>
        )}

        {status === 'DRAFT' && canUpdate && (
          <>
            {!invoice.deposit && (
              <Button type="button" variant="outline" className={buttonClass} onClick={() => void navigate(`/factures/${id}/modifier`)}>
                <Pencil className="h-4 w-4" />
                {t('invoices.action_edit')}
              </Button>
            )}
            <Button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => setDialog(missing.length > 0 ? 'identity' : 'issue')}
            >
              <FileCheck2 className="h-4 w-4" />
              {t('invoices.action_issue')}
            </Button>
          </>
        )}

        {status === 'ISSUED' && !isCreditNote && canUpdate && (
          <Button type="button" className={buttonClass} disabled={busy} onClick={() => setDialog('pay')}>
            <Banknote className="h-4 w-4" />
            {t('invoices.action_pay')}
          </Button>
        )}

        {status === 'PAID' && canUpdate && (
          <Button type="button" variant="outline" className={buttonClass} disabled={busy} onClick={() => setDialog('unpay')}>
            <RotateCcw className="h-4 w-4" />
            {t('invoices.action_unpay')}
          </Button>
        )}

        {status === 'ISSUED' && !isCreditNote && canCreate && !invoice.deductedBy && (
          <Button
            type="button"
            variant="outline"
            className={`${buttonClass} text-destructive`}
            disabled={busy}
            onClick={() => setDialog('credit')}
          >
            <Ban className="h-4 w-4" />
            {t('invoices.action_credit')}
          </Button>
        )}

        {status === 'DRAFT' && canDelete && (
          <Button type="button" variant="outline" className={`${buttonClass} text-destructive`} onClick={() => setDialog('delete')}>
            <Trash2 className="h-4 w-4" />
            {t('invoices.action_delete')}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'issue'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t('invoices.issue_title')}
        description={
          t('invoices.issue_description', { days: paymentDays(org?.defaultPaymentTerms) }) +
          // Un avis, pas un blocage : la loi ne les demande qu'entre professionnels, et l'entreprise sait à qui elle facture
          (noPenalties ? ` ${t('invoices.issue_no_penalties')}` : '')
        }
        confirmLabel={t('invoices.issue_confirm')}
        pending={issue.isPending}
        onConfirm={() => void handleIssue()}
      />

      {/* L'identité de l'entreprise est incomplète : l'API refuserait d'émettre, on le dit avant et on envoie aux réglages */}
      <ConfirmDialog
        open={dialog === 'identity'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t('invoices.identity_title')}
        description={t('invoices.identity_description', { fields: missing.map((key) => t(key)).join(', ') })}
        confirmLabel={t('invoices.identity_confirm')}
        onConfirm={() => void navigate('/parametres/entreprise')}
      />

      <ConfirmDialog
        open={dialog === 'email'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t(invoice.emailedAt ? 'invoices.email_again_title' : 'invoices.email_title')}
        description={t(invoice.emailedAt ? 'invoices.email_again_description' : 'invoices.email_description', {
          reference: name,
          email: invoice.client.email,
        })}
        confirmLabel={t('invoices.email_confirm')}
        pending={emailInvoice.isPending}
        onConfirm={() => void handleEmail()}
      />

      <PayInvoiceDialog
        open={dialog === 'pay'}
        onOpenChange={(open) => !open && setDialog(null)}
        minDay={invoice.issueDate?.slice(0, 10) ?? ''}
        pending={pay.isPending}
        onConfirm={(input) => void handlePay(input)}
      />

      <ConfirmDialog
        open={dialog === 'unpay'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t('invoices.unpay_title')}
        description={t('invoices.unpay_description', { reference: name })}
        confirmLabel={t('invoices.unpay_confirm')}
        pending={unpay.isPending}
        onConfirm={() => void handleUnpay()}
      />

      <ConfirmDestructiveDialog
        open={dialog === 'credit'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t('invoices.credit_title')}
        description={t('invoices.credit_description', { reference: name })}
        confirmLabel={t('invoices.credit_confirm')}
        pending={creditNote.isPending}
        onConfirm={() => void handleCredit()}
      />

      <ConfirmDestructiveDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t('invoices.delete_title')}
        description={t('invoices.delete_description')}
        confirmLabel={t('invoices.action_delete')}
        pending={deleteInvoice.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
