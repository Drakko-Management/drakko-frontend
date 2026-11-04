import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import { useInvoice, useUpdateInvoice } from '@/hooks/use-invoices'
import { useOrganization } from '@/hooks/use-organization'
import { apiErrorMessage } from '@/lib/api-error'
import { paymentDays } from '@/modules/factures/payment-terms'
import { QuoteFormFields } from '@/pages/quotes/QuoteFormFields'
import { EMPTY_QUOTE_FORM, type QuoteFormValues } from '@/pages/quotes/quote-form'
import { deductionsOf, formFromInvoice, toInvoiceInput } from './invoice-form'

const FALLBACK_VAT_RATE = 10

export function EditInvoicePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: invoice, isLoading, isError } = useInvoice(id)
  const updateInvoice = useUpdateInvoice()
  const { data: org } = useOrganization()
  const [values, setValues] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // Le formulaire se remplit une fois, à l'arrivée de la facture : une relecture en arrière-plan ne doit pas écraser la saisie
  useEffect(() => {
    if (invoice && invoice.id !== loadedId) {
      setValues(formFromInvoice(invoice))
      setLoadedId(invoice.id)
    }
  }, [invoice, loadedId])

  async function handleSubmit() {
    try {
      await updateInvoice.mutateAsync({ id, ...toInvoiceInput(values) })
      toast.success(t('invoices.updated'))
      void navigate(`/factures/${id}`, { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.update_error'))
    }
  }

  const back = (
    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
      onClick={() => void navigate(`/factures/${id}`)}
      aria-label={t('common.back')}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />

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

  // Une facture émise ne se modifie plus : on le dit, avec le moyen de la corriger (l'avoir)
  if (invoice.status !== 'DRAFT') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {back}
          <EditPageTitle kind={t('invoices.edit_kind')} name={invoice.reference ?? ''} />
        </div>
        <p className="text-sm text-muted-foreground">{t('invoices.locked')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        {back}
        <EditPageTitle kind={t('invoices.edit_kind')} name={invoice.title || t('invoices.draft_name')} />
      </div>

      <QuoteFormFields
        kind="invoice"
        vatExempt={invoice.vatExempt}
        dueDays={paymentDays(org?.defaultPaymentTerms)}
        deductions={deductionsOf(invoice)}
        values={values}
        onChange={setValues}
        onSubmit={() => void handleSubmit()}
        isPending={updateInvoice.isPending}
        submitLabel={t('invoices.form_save')}
        defaultVatRate={org?.defaultVatRate ?? FALLBACK_VAT_RATE}
      />
    </div>
  )
}
