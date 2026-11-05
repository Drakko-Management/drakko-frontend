import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useCreateInvoice } from '@/hooks/use-invoices'
import { useOrganization } from '@/hooks/use-organization'
import { apiErrorMessage } from '@/lib/api-error'
import { paymentDays } from '@/modules/factures/payment-terms'
import { QuoteFormFields } from '@/pages/quotes/QuoteFormFields'
import { EMPTY_QUOTE_FORM, isFormDirty, type QuoteFormValues } from '@/pages/quotes/quote-form'
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesGuard'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { toInvoiceInput } from './invoice-form'

// Le taux appliqué quand l'organisation n'en a pas réglé (même valeur par défaut que le back)
const FALLBACK_VAT_RATE = 10

/** Une facture à partir de rien. Depuis un devis accepté, c'est un clic sur la fiche du devis (`quoteId`). */
export function CreateInvoicePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createInvoice = useCreateInvoice()
  const { data: org } = useOrganization()
  const [values, setValues] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM)
  // Une saisie non enregistrée ne se perd pas sans prévenir (retour, menu, rafraîchissement)
  const guard = useUnsavedChanges(isFormDirty(values, EMPTY_QUOTE_FORM))

  async function handleSubmit() {
    try {
      const invoice = await createInvoice.mutateAsync(toInvoiceInput(values))
      guard.markSaved()
      toast.success(t('invoices.created'))
      void navigate(`/factures/${invoice.id}`, { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.create_error'))
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/factures')}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t('invoices.form_add_title')}</h1>
      </div>

      <QuoteFormFields
        kind="invoice"
        vatExempt={org?.vatExempt ?? false}
        dueDays={paymentDays(org?.defaultPaymentTerms)}
        values={values}
        onChange={setValues}
        onSubmit={() => void handleSubmit()}
        isPending={createInvoice.isPending}
        submitLabel={t('invoices.form_create')}
        defaultVatRate={org?.defaultVatRate ?? FALLBACK_VAT_RATE}
      />

      <UnsavedChangesDialog guard={guard} />
    </div>
  )
}
