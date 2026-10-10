import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { useCreateClient } from '@/hooks/use-clients'
import { buildAddress } from '@/lib/utils'
import type { Client } from '@/types/api'

export interface ClientFormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  postalCode: string
  city: string
  notes: string
}

const EMPTY: ClientFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  postalCode: '',
  city: '',
  notes: '',
}

function formatPhone(value: string): string {
  const phone = parsePhoneNumberFromString(value, 'FR')
  return phone?.isValid() ? phone.formatNational() : value
}

interface ClientFormProps {
  /** Valeurs de départ (ex. le nom tapé dans la recherche d'un client) */
  initial?: Partial<ClientFormValues>
  /** Place le curseur sur le premier champ obligatoire encore vide (fenêtre de création) */
  autoFocus?: boolean
  onCreated: (client: Client) => void
}

/** Formulaire de création d'un client : page « Nouveau client » et fenêtre ouverte depuis un chantier. */
export function ClientForm({ initial, autoFocus = false, onCreated }: ClientFormProps) {
  const { t } = useTranslation()
  const createClient = useCreateClient()
  const [form, setForm] = useState<ClientFormValues>({ ...EMPTY, ...initial })
  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoFocus) return
    const firstEmpty = [firstNameRef, lastNameRef, emailRef].find((ref) => !ref.current?.value)
    firstEmpty?.current?.focus()
    // une seule fois, à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(key: keyof ClientFormValues, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const address = buildAddress(form.street, form.postalCode, form.city)
    if (!form.firstName || !form.lastName || !form.email || !address) {
      toast.error(t('create_client.required_error'))
      return
    }
    try {
      const client = await createClient.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address,
        notes: form.notes.trim() || undefined,
      })
      toast.success(t('create_client.success'))
      onCreated(client)
    } catch {
      toast.error(t('create_client.error'))
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3" data-tutorial="client-name">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t('common.first_name')} *</Label>
          <Input
            id="firstName"
            ref={firstNameRef}
            className="min-h-[44px]"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t('common.last_name')} *</Label>
          <Input
            id="lastName"
            ref={lastNameRef}
            className="min-h-[44px]"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2" data-tutorial="client-email">
        <Label htmlFor="email">{t('common.email')} *</Label>
        <Input
          id="email"
          ref={emailRef}
          type="email"
          className="min-h-[44px]"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2" data-tutorial="client-phone">
        <Label htmlFor="phone">{t('common.phone')}</Label>
        <Input
          id="phone"
          type="tel"
          className="min-h-[44px]"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          onBlur={(e) => set('phone', formatPhone(e.target.value))}
        />
      </div>

      <div className="space-y-2" data-tutorial="client-address">
        <Label>{t('create_client.billing_address')}</Label>
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

      <div className="space-y-2" data-tutorial="client-notes">
        <Label htmlFor="notes">{t('create_client.notes_label')}</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder={t('create_client.notes_placeholder')}
          className="min-h-[100px]"
        />
      </div>

      <Button
        type="submit"
        className="w-full min-h-[48px] text-base"
        data-tutorial="client-submit"
        disabled={createClient.isPending}
      >
        {createClient.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {t('create_client.submit')}
      </Button>
    </form>
  )
}
