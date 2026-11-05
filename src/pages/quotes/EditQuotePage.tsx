import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import { useQuote, useUpdateQuote } from '@/hooks/use-quotes'
import { useOrganization } from '@/hooks/use-organization'
import { apiErrorMessage } from '@/lib/api-error'
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesGuard'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { QuoteFormFields } from './QuoteFormFields'
import { EMPTY_QUOTE_FORM, formFromQuote, isFormDirty, toQuoteInput, type QuoteFormValues } from './quote-form'

const FALLBACK_VAT_RATE = 10

export function EditQuotePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: quote, isLoading, isError } = useQuote(id)
  const updateQuote = useUpdateQuote()
  const { data: org } = useOrganization()
  const [values, setValues] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM)
  // Ce que le formulaire contenait à l'ouverture : ce qui s'en écarte n'est pas enregistré
  const [baseline, setBaseline] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const guard = useUnsavedChanges(loadedId !== null && isFormDirty(values, baseline))

  // Le formulaire se remplit une fois, à l'arrivée du devis : une relecture en arrière-plan ne doit pas écraser la saisie
  useEffect(() => {
    if (quote && quote.id !== loadedId) {
      const loaded = formFromQuote(quote)
      setValues(loaded)
      setBaseline(loaded)
      setLoadedId(quote.id)
    }
  }, [quote, loadedId])

  async function handleSubmit() {
    try {
      await updateQuote.mutateAsync({ id, ...toQuoteInput(values) })
      guard.markSaved()
      toast.success(t('quotes.updated'))
      void navigate(`/devis/${id}`, { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.update_error'))
    }
  }

  const back = (
    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
      onClick={() => void navigate(`/devis/${id}`)}
      aria-label={t('common.back')}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />

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

  // Un devis envoyé ne se modifie plus : on le dit, avec le moyen de le rouvrir
  if (quote.status !== 'DRAFT') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {back}
          <EditPageTitle kind={t('quotes.edit_kind')} name={quote.reference} />
        </div>
        <p className="text-sm text-muted-foreground">{t('quotes.locked')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        {back}
        <EditPageTitle kind={t('quotes.edit_kind')} name={quote.reference} />
      </div>

      <QuoteFormFields
        vatExempt={quote.vatExempt}
        values={values}
        onChange={setValues}
        onSubmit={() => void handleSubmit()}
        isPending={updateQuote.isPending}
        submitLabel={t('quotes.form_save')}
        defaultVatRate={org?.defaultVatRate ?? FALLBACK_VAT_RATE}
      />

      <UnsavedChangesDialog guard={guard} />
    </div>
  )
}
