import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, Search, X, Check, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { ClientCreateDialog } from '@/components/clients/ClientCreateDialog'
import { useCreateProject, useNextProjectReference } from '@/hooks/use-projects'
import { useOrganization } from '@/hooks/use-organization'
import { useClients } from '@/hooks/use-clients'
import { apiErrorMessage } from '@/lib/api-error'
import { buildAddress, parseAddress, fullName, cn } from '@/lib/utils'
import type { Client } from '@/types/api'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

function ClientSearch({
  value,
  onChange,
  onCreate,
  invalid,
}: {
  value: Client | null
  onChange: (client: Client | null) => void
  /** Ouvre la création d'un client ; reçoit le texte tapé */
  onCreate: (name: string) => void
  invalid: boolean
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const { data, isFetching } = useClients({
    search: debouncedSearch || undefined,
    active: true,
    limit: 8,
  })

  function select(client: Client) {
    onChange(client)
    setSearch('')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setSearch('')
  }

  if (value) {
    return (
      <div className="flex min-h-[44px] items-center gap-3 rounded-md border border-input bg-background px-3">
        <Check className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-sm font-medium">{fullName(value)}</span>
        <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="client-search"
          className={cn('min-h-[44px] pl-9 pr-9', invalid && 'border-destructive focus-visible:ring-destructive')}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'client-error' : undefined}
          placeholder={t('create_project.search_client')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          // en erreur, le focus vient de la validation : la liste masquerait le message juste dessous,
          // elle s'ouvre au toucher (onClick) ou dès qu'on tape
          onFocus={() => { if (!invalid) setOpen(true) }}
          onClick={() => setOpen(true)}
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setSearch(''); setDebouncedSearch('') }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {isFetching && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('common.searching')}
            </li>
          )}
          {!isFetching && data?.data.length === 0 && (
            <>
              <li className="px-3 py-2.5 text-sm text-muted-foreground">{t('create_project.no_client')}</li>
              {debouncedSearch === search && (
                <li className="border-t">
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted active:bg-muted"
                    onClick={() => { setOpen(false); onCreate(search.trim()) }}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">
                      {search.trim() ? t('create_project.create_client', { name: search.trim() }) : t('create_client.title')}
                    </span>
                  </button>
                </li>
              )}
            </>
          )}
          {data?.data.map((client) => (
            <li key={client.id} className="border-b last:border-0">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted active:bg-muted"
                onMouseDown={(e) => { e.preventDefault(); select(client) }}
              >
                <span className="font-medium">{fullName(client)}</span>
                {client.email && (
                  <span className="ml-2 text-xs text-muted-foreground">{client.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
  const clientError = clientAttempts > 0 && !selectedClient

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

  function handleClientChange(client: Client | null) {
    setSelectedClient(client)
    setClientAttempts(0)
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
              max={form.expectedEndDate || undefined}
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
              min={form.startDate || undefined}
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

        <div className="space-y-2">
          <Label htmlFor="projectManager">{t('common.project_manager')}</Label>
          <Input
            id="projectManager"
            className="min-h-[44px]"
            value={form.projectManager}
            onChange={(e) => set('projectManager', e.target.value)}
            placeholder={t('create_project.project_manager_placeholder')}
          />
        </div>

        <div className="space-y-2">
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
