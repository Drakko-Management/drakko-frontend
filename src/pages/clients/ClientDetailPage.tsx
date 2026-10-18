import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Mail, Phone, MapPin, FileText, Loader2, MessageSquare } from 'lucide-react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import { RecordActions } from '@/components/common/RecordActions'
import { useClient, useUpdateClient, useSetClientActive, useDeleteClient } from '@/hooks/use-clients'
import type { Client } from '@/types/api'
import { useProjects } from '@/hooks/use-projects'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage } from '@/lib/api-error'
import { fullName, formatDate, buildAddress, parseAddress } from '@/lib/utils'

type ClientForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  postalCode: string
  city: string
  notes: string
}

function toForm(client: Client): ClientForm {
  const { street, postalCode, city } = parseAddress(client.address ?? '')
  return {
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone ?? '',
    street,
    postalCode,
    city,
    notes: client.notes ?? '',
  }
}

function formatPhone(value: string): string {
  const phone = parsePhoneNumberFromString(value, 'FR')
  return phone?.isValid() ? phone.formatNational() : value
}

// Raccourcis de contact : appeler, écrire, itinéraire. Ils n'apparaissent que si la donnée existe.
function ContactShortcuts({ client }: { client: Client }) {
  const { t } = useTranslation()
  const link =
    'flex min-h-[44px] flex-1 basis-28 items-center justify-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted/50 active:bg-muted'
  return (
    <div className="flex flex-wrap gap-2">
      {client.phone && (
        <a href={`tel:${client.phone}`} className={link}>
          <Phone className="h-4 w-4 text-muted-foreground" />
          {t('client_detail.call')}
        </a>
      )}
      {client.phone && (
        <a href={`sms:${client.phone}`} className={link} title={t('client_detail.send_sms')}>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          {t('client_detail.sms')}
        </a>
      )}
      <a href={`mailto:${client.email}`} className={link}>
        <Mail className="h-4 w-4 text-muted-foreground" />
        {t('client_detail.write')}
      </a>
      {client.address && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {t('client_detail.map')}
        </a>
      )}
    </div>
  )
}

function ClientView({ client }: { client: Client }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { can } = usePermissions()
  const { data: projects } = useProjects({ clientId: client.id })
  const updateClient = useUpdateClient(client.id)
  const setActive = useSetClientActive()
  const deleteClient = useDeleteClient()

  const canEdit = can('clients', 'update')
  const initial = toForm(client)
  const [form, setForm] = useState<ClientForm>(initial)
  // « Enregistrer » ne s'active que si la fiche a changé
  const dirty = (Object.keys(initial) as (keyof ClientForm)[]).some((k) => form[k].trim() !== initial[k].trim())

  async function handleSave() {
    try {
      await updateClient.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: buildAddress(form.street, form.postalCode, form.city),
        notes: form.notes.trim(),
      })
      toast.success(t('client_detail.updated'))
    } catch {
      toast.error(t('client_detail.update_error'))
    }
  }

  async function handleToggleActive() {
    try {
      await setActive.mutateAsync({ id: client.id, active: !client.active })
      toast.success(t(client.active ? 'clients.row_deactivated' : 'clients.row_activated'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'clients.row_error'))
    }
  }

  async function handleDelete() {
    try {
      const { result } = await deleteClient.mutateAsync(client.id)
      toast.success(t(result === 'deleted' ? 'clients.deleted' : 'clients.deleted_kept'))
      void navigate('/clients')
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'clients.delete_error'))
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <EditPageTitle kind={t('clients.edit_title')} name={fullName(client)} />
        <div className="ml-auto flex items-center gap-2">
          <RecordActions
            active={client.active}
            pending={setActive.isPending || deleteClient.isPending}
            onToggle={canEdit ? () => void handleToggleActive() : undefined}
            toggleLabel={t(client.active ? 'clients.row_deactivate' : 'clients.row_activate')}
            onDelete={can('clients', 'delete') ? handleDelete : undefined}
            deleteLabel={t('clients.row_delete')}
            deleteTitle={t('clients.delete_title')}
            deleteDescription={t('clients.delete_message')}
            deleteConfirmLabel={t('clients.delete_confirm')}
          />
        </div>
      </div>

      <ContactShortcuts client={client} />

      {canEdit ? (
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('common.first_name')}</Label>
              <Input
                className="min-h-[44px]"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.last_name')}</Label>
              <Input
                className="min-h-[44px]"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('common.email')}</Label>
            <Input
              className="min-h-[44px]"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('common.phone')}</Label>
            <Input
              className="min-h-[44px]"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              onBlur={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('client_detail.billing_address')}</Label>
            <AddressAutocomplete
              placeholder={t('common.street_placeholder')}
              className="min-h-[44px]"
              value={form.street}
              onChange={(v) => setForm({ ...form, street: v })}
              onSelect={(s) => setForm({ ...form, street: s.street, postalCode: s.postalCode, city: s.city })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder={t('common.postal_code')}
                className="min-h-[44px]"
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
              <Input
                placeholder={t('common.city')}
                className="min-h-[44px]"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('create_client.notes_label')}</Label>
            <Textarea
              value={form.notes}
              placeholder={t('create_client.notes_placeholder')}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button
            className="w-full min-h-[48px]"
            onClick={() => void handleSave()}
            disabled={updateClient.isPending || !dirty}
          >
            {updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('client_detail.save')}
          </Button>
        </Card>
      ) : (
        <Card className="divide-y">
          {client.address && (
            <div className="flex items-center gap-3 p-4 min-h-[56px]">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm">{client.address}</p>
            </div>
          )}
          {client.notes && (
            <div className="flex items-start gap-3 p-4">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </Card>
      )}

      {projects?.data && projects.data.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t('client_detail.projects', { count: projects.total })}</h2>
          <div className="space-y-2">
            {projects.data.map((p) => (
              <button
                key={p.id}
                onClick={() => void navigate(`/chantiers/${p.id}`)}
                className="flex min-h-[64px] w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.reference} · {formatDate(p.expectedEndDate)}</p>
                </div>
                <StatusBadge status={p.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: client, isLoading } = useClient(id ?? '')

  if (isLoading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (!client) return null

  // La clé repart de la fiche enregistrée : après « Enregistrer », le formulaire reprend les valeurs du serveur
  return <ClientView key={client.updatedAt} client={client} />
}
