import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AddressFields } from '@/components/common/AddressFields'
import type { AddressValue } from '@/components/common/AddressFields'
import { useCreateExpressProject } from '@/hooks/use-projects'
import { apiErrorMessage } from '@/lib/api-error'
import { formatPhone } from '@/lib/phone'
import { buildAddress } from '@/lib/utils'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

const EMPTY_ADDRESS: AddressValue = { street: '', postalCode: '', city: '' }

export function ExpressProjectPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const create = useCreateExpressProject()

  const [form, setForm] = useState({
    clientFirstName: '',
    clientLastName: '',
    clientEmail: '',
    clientPhone: '',
    title: '',
    description: '',
  })
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS)
  // Le plus courant : le client est facturé là où l'on intervient ; sinon une seconde adresse à saisir
  const [billingSame, setBillingSame] = useState(true)
  const [billing, setBilling] = useState<AddressValue>(EMPTY_ADDRESS)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const siteAddress = buildAddress(address.street, address.postalCode, address.city)
    const billingAddress = billingSame ? undefined : buildAddress(billing.street, billing.postalCode, billing.city)
    if (!form.clientFirstName.trim() || !form.clientLastName.trim() || !form.clientEmail.trim() || !siteAddress || (!billingSame && !billingAddress)) {
      toast.error(t('express_project.required_error'))
      return
    }
    try {
      const project = await create.mutateAsync({
        clientFirstName: form.clientFirstName.trim(),
        clientLastName: form.clientLastName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientPhone: form.clientPhone.trim() || undefined,
        clientAddress: billingAddress,
        title: form.title.trim() || undefined,
        description: form.description.trim() || undefined,
        address: siteAddress,
      })
      toast.success(t('express_project.success'))
      void navigate(`/chantiers/${project.id}/rapport`)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'express_project.error'))
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h1 className="text-lg font-bold">{t('express_project.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t('express_project.subtitle')}</p>
        </div>
        <TutorialHelpButton scope="express_form" className="ml-auto h-10 w-10 shrink-0" />
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Client */}
        <section className="space-y-3" data-tutorial="express-client">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('express_project.client_section')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="clientFirstName">{t('common.first_name')} *</Label>
              <Input
                id="clientFirstName"
                className="min-h-[44px]"
                value={form.clientFirstName}
                onChange={set('clientFirstName')}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientLastName">{t('common.last_name')} *</Label>
              <Input
                id="clientLastName"
                className="min-h-[44px]"
                value={form.clientLastName}
                onChange={set('clientLastName')}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">{t('common.email')} *</Label>
            <Input
              id="clientEmail"
              type="email"
              className="min-h-[44px]"
              value={form.clientEmail}
              onChange={set('clientEmail')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientPhone">{t('common.phone')}</Label>
            <Input
              id="clientPhone"
              type="tel"
              className="min-h-[44px]"
              autoComplete="tel"
              value={form.clientPhone}
              onChange={set('clientPhone')}
              onBlur={(e) => setForm((f) => ({ ...f, clientPhone: formatPhone(e.target.value) }))}
            />
          </div>
        </section>

        {/* Chantier */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('express_project.project_section')}
          </h2>
          <div className="space-y-3" data-tutorial="express-project">
            <div className="space-y-2">
              <Label htmlFor="title">{t('express_project.title_label')}</Label>
              <Input
                id="title"
                className="min-h-[44px]"
                placeholder={t('express_project.title_placeholder')}
                value={form.title}
                onChange={set('title')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('express_project.address_label')} *</Label>
              <AddressFields value={address} onChange={setAddress} required />
            </div>
          </div>

          <div className="space-y-3" data-tutorial="express-billing">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-medium">
              <Switch checked={billingSame} onCheckedChange={setBillingSame} />
              {t('express_project.billing_same')}
            </label>
            {!billingSame && (
              <div className="space-y-2">
                <Label>{t('create_client.billing_address')}</Label>
                <AddressFields value={billing} onChange={setBilling} required />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')}</Label>
            <Textarea
              id="description"
              className="min-h-[100px]"
              placeholder={t('express_project.description_placeholder')}
              value={form.description}
              onChange={set('description')}
            />
          </div>
        </section>

        <Button
          type="submit"
          className="w-full min-h-[48px] gap-2 text-base"
          data-tutorial="express-submit"
          disabled={create.isPending}
        >
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {create.isPending ? t('express_project.creating') : t('express_project.submit')}
        </Button>
      </form>
    </div>
  )
}
