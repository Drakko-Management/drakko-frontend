import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Mail, Phone, MapPin, FileText, Loader2, MessageSquare } from 'lucide-react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { useClient, useUpdateClient, useDeactivateClient } from '@/hooks/use-clients'
import { useProjects } from '@/hooks/use-projects'
import { usePermissions } from '@/hooks/use-permissions'
import { fullName, formatDate, buildAddress, parseAddress } from '@/lib/utils'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)

  const { can } = usePermissions()
  const { data: client, isLoading } = useClient(id ?? '')
  const { data: projects } = useProjects({ clientId: id })
  const updateClient = useUpdateClient(id ?? '')
  const deactivate = useDeactivateClient(id ?? '')

  const [form, setForm] = useState<{
    firstName: string
    lastName: string
    email: string
    phone: string
    street: string
    postalCode: string
    city: string
    notes: string
  } | null>(null)

  useEffect(() => {
    if (client && searchParams.get('edit') === 'true') startEdit()
  }, [client]) // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit() {
    if (!client) return
    const { street, postalCode, city } = parseAddress(client.address ?? '')
    setForm({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone ?? '',
      street,
      postalCode,
      city,
      notes: client.notes ?? '',
    })
    setEditing(true)
  }

  function formatPhone(value: string): string {
    const phone = parsePhoneNumberFromString(value, 'FR')
    return phone?.isValid() ? phone.formatNational() : value
  }

  async function handleSave() {
    if (!form) return
    try {
      await updateClient.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: buildAddress(form.street, form.postalCode, form.city),
        notes: form.notes.trim() || undefined,
      })
      toast.success(t('client_detail.updated'))
      setEditing(false)
    } catch {
      toast.error(t('client_detail.update_error'))
    }
  }

  async function handleDeactivate() {
    if (!confirm(t('client_detail.deactivate_confirm'))) return
    try {
      await deactivate.mutateAsync()
      toast.success(t('client_detail.deactivated'))
      void navigate('/clients')
    } catch {
      toast.error(t('client_detail.deactivate_error'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">{fullName(client)}</h1>
        </div>
        {!editing && can('clients', 'update') && (
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={startEdit}>
            {t('client_detail.edit')}
          </Button>
        )}
      </div>

      {editing && form ? (
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px]"
              onClick={() => setEditing(false)}
            >
              {t('client_detail.cancel')}
            </Button>
            <Button
              className="flex-1 min-h-[44px]"
              onClick={() => void handleSave()}
              disabled={updateClient.isPending}
            >
              {updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('client_detail.save')}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="divide-y">
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-3 p-4 min-h-[56px] hover:bg-muted/50 transition-colors"
          >
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-primary underline-offset-2 hover:underline">{client.email}</p>
          </a>
          {client.phone && (
            <div className="flex items-center gap-3 p-4 min-h-[56px]">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a href={`tel:${client.phone}`} className="text-sm text-primary flex-1 underline-offset-2 hover:underline">
                {client.phone}
              </a>
              <a
                href={`sms:${client.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title={t('client_detail.send_sms')}
              >
                <MessageSquare className="h-4 w-4" />
              </a>
            </div>
          )}
          {client.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 min-h-[56px] hover:bg-muted/50 transition-colors"
            >
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-primary underline-offset-2 hover:underline">{client.address}</p>
            </a>
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

      {can('clients', 'delete') && (
        <Button
          variant="destructive"
          className="w-full min-h-[44px]"
          onClick={() => void handleDeactivate()}
          disabled={deactivate.isPending}
        >
          {t('client_detail.deactivate')}
        </Button>
      )}
    </div>
  )
}
