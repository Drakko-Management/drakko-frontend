import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { ClientCreateDialog } from '@/components/clients/ClientCreateDialog'
import { ClientSearch } from '@/components/clients/ClientSearch'
import { useCreateProject, useNextProjectReference } from '@/hooks/use-projects'
import { useOrganization } from '@/hooks/use-organization'
import { usePermissions } from '@/hooks/use-permissions'
import { useQuote, useQuotes } from '@/hooks/use-quotes'
import { apiErrorMessage } from '@/lib/api-error'
import { buildAddress, parseAddress, dateRangeBounds, fullName } from '@/lib/utils'
import { formatMoney } from '@/modules/devis/format'
import type { Client, Quote } from '@/types/api'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

// Le devis ne porte que les coordonnées du client : de quoi remplir le champ client, pas sa fiche complète
function clientOfQuote(quote: Quote): Client {
  return { ...quote.client, notes: null, active: true, createdAt: quote.createdAt, updatedAt: quote.updatedAt }
}

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createProject = useCreateProject()
  const { data: org } = useOrganization()
  const autoRef = org?.autoProjectReference ?? false
  const { data: nextRef } = useNextProjectReference(autoRef)

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  // Nombre d'envois refusés faute de client (0 = rien à signaler) : chaque refus remet le curseur sur le champ
  const [clientAttempts, setClientAttempts] = useState(0)
  // Texte tapé dans la recherche quand la fenêtre de création de client est ouverte (null = fermée)
  const [newClientName, setNewClientName] = useState<string | null>(null)
  const [form, setForm] = useState({
    reference: '',
    title: '',
    street: '',
    postalCode: '',
    city: '',
    projectManager: '',
    description: '',
    quoteAmount: '',
    startDate: '',
    expectedEndDate: '',
  })
  const [sameAsBilling, setSameAsBilling] = useState(false)

  // Chantier issu d'un devis accepté (ADR-032), par deux chemins : le bouton de la fiche du devis (`?devis=`) ou le choix
  // d'un devis en haut du formulaire. Les deux remplissent le formulaire de la même façon.
  const [searchParams] = useSearchParams()
  const urlQuoteId = searchParams.get('devis') ?? ''
  const { can } = usePermissions()
  const canUseQuotes = can('devis', 'read')
  const [linkedQuote, setLinkedQuote] = useState<Quote | null>(null)
  const [quoteUnavailable, setQuoteUnavailable] = useState(false)
  const urlQuote = useQuote(canUseQuotes ? urlQuoteId : '')
  const appliedUrlQuote = useRef('')
  // Une fois un client choisi, seuls ses devis sont proposés
  const { data: quoteChoices } = useQuotes(
    { status: 'ACCEPTED', withoutProject: true, clientId: selectedClient?.id },
    canUseQuotes,
  )
  const quoteProblem = quoteUnavailable || (canUseQuotes && Boolean(urlQuoteId) && urlQuote.isError)
  const showQuotePicker = canUseQuotes && (Boolean(linkedQuote) || quoteProblem || (quoteChoices?.length ?? 0) > 0)

  const clientError = clientAttempts > 0 && !selectedClient
  const dates = dateRangeBounds(form.startDate, form.expectedEndDate)

  // Après le rendu en erreur : le champ sait qu'il est invalide et n'ouvre pas la liste, qui masquerait le message
  useEffect(() => {
    if (!clientError) return
    const field = document.getElementById('client-search')
    field?.focus()
    field?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [clientAttempts, clientError])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function applyQuote(quote: Quote) {
    handleClientChange(clientOfQuote(quote))
    setForm((f) => ({ ...f, title: quote.title?.trim() || quote.reference, quoteAmount: quote.total }))
    // Après le changement de client, qui retire un lien précédent : le dernier appel l'emporte
    setLinkedQuote(quote)
    setQuoteUnavailable(false)
  }

  function handleQuoteChoice(id: string) {
    const quote = quoteChoices?.find((q) => q.id === id)
    if (quote) applyQuote(quote)
  }

  // Le devis du bouton arrive par l'API : on le reprend une fois, s'il peut encore donner un chantier
  useEffect(() => {
    const quote = urlQuote.data
    if (!quote || appliedUrlQuote.current === quote.id) return
    appliedUrlQuote.current = quote.id
    if (quote.status !== 'ACCEPTED' || quote.project) setQuoteUnavailable(true)
    else applyQuote(quote)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuote.data])

  function handleClientChange(client: Client | null) {
    setSelectedClient(client)
    setClientAttempts(0)
    // Le chantier d'un devis a le client du devis : en choisir un autre retire le lien
    if (linkedQuote && client?.id !== linkedQuote.clientId) setLinkedQuote(null)
    if (client?.address) {
      const { street, postalCode, city } = parseAddress(client.address)
      setForm((f) => ({ ...f, street, postalCode, city }))
      setSameAsBilling(true)
    } else {
      setSameAsBilling(false)
    }
  }

  function handleClientCreated(client: Client) {
    setNewClientName(null)
    handleClientChange(client)
  }

  function handleSameAsBillingChange(checked: boolean) {
    setSameAsBilling(checked)
    if (checked && selectedClient?.address) {
      const { street, postalCode, city } = parseAddress(selectedClient.address)
      setForm((f) => ({ ...f, street, postalCode, city }))
    } else if (!checked) {
      setForm((f) => ({ ...f, street: '', postalCode: '', city: '' }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const address = buildAddress(form.street, form.postalCode, form.city)
    const refValue = form.reference.trim() || (autoRef ? undefined : '')
    if ((!autoRef && !form.reference) || !form.title || !address || !selectedClient) {
      toast.error(t('create_project.required_error'))
      // le champ client n'est pas un champ natif « required » : on le signale nous-mêmes
      if (!selectedClient) setClientAttempts((n) => n + 1)
      return
    }
    try {
      const project = await createProject.mutateAsync({
        reference: refValue,
        title: form.title.trim(),
        address,
        clientId: selectedClient.id,
        quoteId: linkedQuote?.id,
        projectManager: form.projectManager.trim() || undefined,
        description: form.description.trim() || undefined,
        quoteAmount: form.quoteAmount ? parseFloat(form.quoteAmount) : undefined,
        startDate: form.startDate || undefined,
        expectedEndDate: form.expectedEndDate || undefined,
      })
      toast.success(t('create_project.success'))
      void navigate(`/chantiers/${project.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'create_project.error'))
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/chantiers')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t('create_project.title')}</h1>
        <TutorialHelpButton scope="project_form" className="ml-auto h-10 w-10 shrink-0" />
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        {showQuotePicker && (
          <section className="space-y-2 rounded-xl border bg-card p-3" data-testid="project-from-quote">
            {linkedQuote ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{t('create_project.from_quote_linked', { reference: linkedQuote.reference })}</p>
                <Button type="button" variant="outline" size="sm" className="min-h-[44px] shrink-0" onClick={() => setLinkedQuote(null)}>
                  {t('create_project.from_quote_remove')}
                </Button>
              </div>
            ) : (
              <>
                <Label htmlFor="from-quote">{t('create_project.from_quote_label')}</Label>
                <select
                  id="from-quote"
                  value=""
                  onChange={(e) => handleQuoteChoice(e.target.value)}
                  className="h-11 w-full cursor-pointer rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('create_project.from_quote_placeholder')}</option>
                  {quoteChoices?.map((q) => (
                    <option key={q.id} value={q.id}>
                      {`${q.reference} · ${fullName(q.client)}${q.title ? ` · ${q.title}` : ''} · ${formatMoney(q.total)}`}
                    </option>
                  ))}
                </select>
              </>
            )}
            {quoteProblem && !linkedQuote && (
              <p role="alert" className="text-xs text-destructive">
                {t('create_project.from_quote_unavailable')}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t('create_project.from_quote_hint')}</p>
          </section>
        )}

        <div className="space-y-4" data-tutorial="project-title">
        <div className="space-y-2">
          <Label htmlFor="reference">
            {t('create_project.label_reference')} *
          </Label>
          <Input
            id="reference"
            className="min-h-[44px]"
            value={form.reference || (autoRef ? (nextRef ?? '') : '')}
            onChange={(e) => set('reference', e.target.value)}
            placeholder={autoRef ? (nextRef ?? t('create_project.reference_auto_placeholder')) : t('create_project.reference_placeholder')}
            required={!autoRef}
          />
          {autoRef && (
            <p className="text-xs text-muted-foreground">{t('create_project.reference_auto_hint')}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">{t('create_project.label_title')} *</Label>
          <Input
            id="title"
            className="min-h-[44px]"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={t('create_project.title_placeholder')}
            required
          />
        </div>

        </div>

        <div className="space-y-2" data-tutorial="project-client" data-tutorial-ready={selectedClient ? 'true' : 'false'}>
          <Label htmlFor="client-search">{t('create_project.label_client')} *</Label>
          <ClientSearch
            value={selectedClient}
            onChange={handleClientChange}
            onCreate={setNewClientName}
            invalid={clientError}
          />
          {clientError && (
            <p id="client-error" role="alert" className="text-xs text-destructive">
              {t('create_project.client_required')}
            </p>
          )}
        </div>

        <div className="space-y-2" data-tutorial="project-address">
          <div className="flex items-center gap-3">
            <Label>{t('common.address')} *</Label>
            {selectedClient?.address && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Switch
                  checked={sameAsBilling}
                  onCheckedChange={handleSameAsBillingChange}
                  className="scale-75 origin-left"
                />
                {t('create_project.same_as_billing')}
              </label>
            )}
          </div>
          <AddressAutocomplete
            placeholder={t('common.street_placeholder')}
            className="min-h-[44px]"
            value={form.street}
            onChange={(v) => { if (!sameAsBilling) set('street', v) }}
            onSelect={(s) => { if (!sameAsBilling) setForm((f) => ({ ...f, street: s.street, postalCode: s.postalCode, city: s.city })) }}
            required
            disabled={sameAsBilling}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={t('common.postal_code')}
              className="min-h-[44px]"
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(e) => { if (!sameAsBilling) set('postalCode', e.target.value) }}
              disabled={sameAsBilling}
            />
            <Input
              placeholder={t('common.city')}
              className="min-h-[44px]"
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => { if (!sameAsBilling) set('city', e.target.value) }}
              disabled={sameAsBilling}
            />
          </div>
        </div>

        <div className="space-y-4" data-tutorial="project-planning">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startDate">{t('common.start_date')}</Label>
            <Input
              id="startDate"
              type="date"
              // le calendrier grise les jours après la fin prévue (et inversement pour la date de fin)
              min={dates.start.min}
              max={dates.start.max}
              className="min-h-[44px]"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedEndDate">{t('common.end_date')}</Label>
            <Input
              id="expectedEndDate"
              type="date"
              min={dates.end.min}
              max={dates.end.max}
              className="min-h-[44px]"
              value={form.expectedEndDate}
              onChange={(e) => set('expectedEndDate', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quoteAmount">{t('common.quote_amount')}</Label>
          <Input
            id="quoteAmount"
            type="number"
            min="0"
            step="0.01"
            className="min-h-[44px]"
            value={form.quoteAmount}
            onChange={(e) => set('quoteAmount', e.target.value)}
            placeholder="0"
          />
        </div>
        </div>

        <div className="space-y-2" data-tutorial="project-manager">
          <Label htmlFor="projectManager">{t('common.project_manager')}</Label>
          <Input
            id="projectManager"
            className="min-h-[44px]"
            value={form.projectManager}
            onChange={(e) => set('projectManager', e.target.value)}
            placeholder={t('create_project.project_manager_placeholder')}
          />
        </div>

        <div className="space-y-2" data-tutorial="project-description">
          <Label htmlFor="description">{t('common.description')}</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder={t('create_project.description_placeholder')}
            className="min-h-[100px]"
          />
        </div>

        <Button
          type="submit"
          className="w-full min-h-[48px] text-base"
          data-tutorial="project-submit"
          disabled={createProject.isPending}
        >
          {createProject.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t('create_project.submit')}
        </Button>
      </form>

      {newClientName !== null && (
        <ClientCreateDialog
          name={newClientName}
          onClose={() => setNewClientName(null)}
          onCreated={handleClientCreated}
        />
      )}
    </div>
  )
}
