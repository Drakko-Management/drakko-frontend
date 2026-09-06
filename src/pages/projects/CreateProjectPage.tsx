import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, Search, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { useCreateProject, useNextProjectReference } from '@/hooks/use-projects'
import { useOrganization } from '@/hooks/use-organization'
import { useClients } from '@/hooks/use-clients'
import { buildAddress, parseAddress, fullName } from '@/lib/utils'
import type { Client } from '@/types/api'

function ClientSearch({
  value,
  onChange,
}: {
  value: Client | null
  onChange: (client: Client | null) => void
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
          className="min-h-[44px] pl-9 pr-9"
          placeholder={t('create_project.search_client')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
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
            <li className="px-3 py-2.5 text-sm text-muted-foreground">{t('create_project.no_client')}</li>
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

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleClientChange(client: Client | null) {
    setSelectedClient(client)
    if (client?.address) {
      const { street, postalCode, city } = parseAddress(client.address)
      setForm((f) => ({ ...f, street, postalCode, city }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const address = buildAddress(form.street, form.postalCode, form.city)
    const refValue = form.reference.trim() || (autoRef ? undefined : '')
    if ((!autoRef && !form.reference) || !form.title || !address || !selectedClient) {
      toast.error(t('create_project.required_error'))
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
    } catch {
      toast.error(t('create_project.error'))
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
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reference">
            {t('create_project.label_reference')} {autoRef ? '' : '*'}
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

        <div className="space-y-2">
          <Label>{t('create_project.label_client')} *</Label>
          <ClientSearch value={selectedClient} onChange={handleClientChange} />
        </div>

        <div className="space-y-2">
          <Label>{t('common.address')} *</Label>
          <AddressAutocomplete
            placeholder={t('common.street_placeholder')}
            className="min-h-[44px]"
            value={form.street}
            onChange={(v) => set('street', v)}
            onSelect={(s) => setForm((f) => ({ ...f, street: s.street, postalCode: s.postalCode, city: s.city }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={t('common.postal_code')}
              className="min-h-[44px]"
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(e) => set('postalCode', e.target.value)}
            />
            <Input
              placeholder={t('common.city')}
              className="min-h-[44px]"
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startDate">{t('common.start_date')}</Label>
            <Input
              id="startDate"
              type="date"
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
          disabled={createProject.isPending}
        >
          {createProject.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t('create_project.submit')}
        </Button>
      </form>
    </div>
  )
}
