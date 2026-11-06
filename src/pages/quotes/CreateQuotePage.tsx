import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useCreateQuote } from '@/hooks/use-quotes'
import { useOrganization } from '@/hooks/use-organization'
import { useClientFromUrl } from '@/hooks/use-client-from-url'
import { apiErrorMessage } from '@/lib/api-error'
import { Skeleton } from '@/components/ui/skeleton'
import type { Client } from '@/types/api'
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesGuard'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { QuoteFormFields } from './QuoteFormFields'
import { EMPTY_QUOTE_FORM, isFormDirty, toQuoteInput, type QuoteFormValues } from './quote-form'

// Le taux appliqué quand l'organisation n'en a pas réglé (même valeur par défaut que le back)
const FALLBACK_VAT_RATE = 10

/** Un devis neuf. Le raccourci « Nouveau devis » de la fiche client (`?client=`) arrive avec ce client déjà choisi. */
export function CreateQuotePage() {
  const { ready, client } = useClientFromUrl()
  if (!ready) return <Skeleton className="h-40 rounded-xl" />
  // Le formulaire naît une fois le client connu : il part de lui, sans passer par un « saisie modifiée »
  return <CreateQuoteForm initialClient={client} />
}

function CreateQuoteForm({ initialClient }: { initialClient: Client | null }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createQuote = useCreateQuote()
  const { data: org } = useOrganization()
  const [initial] = useState<QuoteFormValues>(() => ({ ...EMPTY_QUOTE_FORM, client: initialClient }))
  const [values, setValues] = useState<QuoteFormValues>(initial)
  // Une saisie non enregistrée ne se perd pas sans prévenir (retour, menu, rafraîchissement)
  const guard = useUnsavedChanges(isFormDirty(values, initial))

  async function handleSubmit() {
    try {
      const quote = await createQuote.mutateAsync(toQuoteInput(values))
      guard.markSaved()
      toast.success(t('quotes.created', { reference: quote.reference }))
      void navigate(`/devis/${quote.id}`, { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quotes.create_error'))
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate(initialClient ? `/clients/${initialClient.id}` : '/devis')}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t('quotes.form_add_title')}</h1>
      </div>

      <QuoteFormFields
        vatExempt={org?.vatExempt ?? false}
        values={values}
        onChange={setValues}
        onSubmit={() => void handleSubmit()}
        isPending={createQuote.isPending}
        submitLabel={t('quotes.form_create')}
        defaultVatRate={org?.defaultVatRate ?? FALLBACK_VAT_RATE}
      />

      <UnsavedChangesDialog guard={guard} />
    </div>
  )
}
