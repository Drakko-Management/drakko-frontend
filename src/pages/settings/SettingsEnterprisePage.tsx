import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Download, Loader2, Trash2, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useOrganization,
  useUpdateOrganization,
  useUploadLogo,
  useDeleteLogo,
} from '@/hooks/use-organization'
import { SettingsSubHeader } from './SettingsSubHeader'

type OrgFormState = {
  name: string
  language: string
  // Identité
  tradeName: string
  siret: string
  vatNumber: string
  legalForm: string
  shareCapital: string
  // Coordonnées
  phone: string
  mobile: string
  email: string
  website: string
  // Adresse
  address: string
  addressLine2: string
  postalCode: string
  city: string
  country: string
  // Banque
  bankHolder: string
  iban: string
  bic: string
  // Assurance
  insurerName: string
  insurerPolicy: string
  insurerExpiry: string
  // Apparence
  primaryColor: string
  // Documents
  projectPrefix: string
  autoProjectReference: boolean
  quotePrefix: string
  invoicePrefix: string
  reportPrefix: string
  defaultVatRate: string
  defaultPaymentTerms: string
  latePaymentPenalties: string
}

const EMPTY: OrgFormState = {
  name: '', language: 'fr',
  tradeName: '', siret: '', vatNumber: '', legalForm: '', shareCapital: '',
  phone: '', mobile: '', email: '', website: '',
  address: '', addressLine2: '', postalCode: '', city: '', country: 'France',
  bankHolder: '', iban: '', bic: '',
  insurerName: '', insurerPolicy: '', insurerExpiry: '',
  primaryColor: '#1a7a33',
  projectPrefix: 'CH', autoProjectReference: false,
  quotePrefix: 'DEV', invoicePrefix: 'FAC', reportPrefix: 'RAP',
  defaultVatRate: '10', defaultPaymentTerms: '', latePaymentPenalties: '',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 pb-1">
      {children}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}

export function SettingsEnterprisePage() {
  const { t } = useTranslation()
  const { data: org, isLoading: orgLoading } = useOrganization()
  const updateOrg = useUpdateOrganization()
  const uploadLogo = useUploadLogo()
  const deleteLogo = useDeleteLogo()

  const [form, setForm] = useState<OrgFormState>(EMPTY)
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!org) return
    setForm({
      name:                org.name ?? '',
      language:            org.language ?? 'fr',
      tradeName:           org.tradeName ?? '',
      siret:               org.siret ?? '',
      vatNumber:           org.vatNumber ?? '',
      legalForm:           org.legalForm ?? '',
      shareCapital:        org.shareCapital ?? '',
      phone:               org.phone ?? '',
      mobile:              org.mobile ?? '',
      email:               org.email ?? '',
      website:             org.website ?? '',
      address:             org.address ?? '',
      addressLine2:        org.addressLine2 ?? '',
      postalCode:          org.postalCode ?? '',
      city:                org.city ?? '',
      country:             org.country ?? 'France',
      bankHolder:          org.bankHolder ?? '',
      iban:                org.iban ?? '',
      bic:                 org.bic ?? '',
      insurerName:         org.insurerName ?? '',
      insurerPolicy:       org.insurerPolicy ?? '',
      insurerExpiry:       org.insurerExpiry ?? '',
      primaryColor:        org.primaryColor ?? '#1a7a33',
      projectPrefix:       org.projectPrefix ?? 'CH',
      autoProjectReference: org.autoProjectReference ?? false,
      quotePrefix:         org.quotePrefix ?? 'DEV',
      invoicePrefix:       org.invoicePrefix ?? 'FAC',
      reportPrefix:        org.reportPrefix ?? 'RAP',
      defaultVatRate:      String(org.defaultVatRate ?? 10),
      defaultPaymentTerms: org.defaultPaymentTerms ?? '',
      latePaymentPenalties:org.latePaymentPenalties ?? '',
    })
  }, [org])

  function f(key: keyof OrgFormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('settings.logo_type_error'))
      return
    }
    void uploadLogo.mutateAsync(file, {
      onSuccess: () => toast.success(t('settings.logo_uploaded')),
      onError: () => toast.error(t('settings.logo_error')),
    })
    e.target.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void updateOrg.mutateAsync({
      name:                form.name.trim(),
      language:            form.language,
      tradeName:           form.tradeName || undefined,
      siret:               form.siret || undefined,
      vatNumber:           form.vatNumber || undefined,
      legalForm:           form.legalForm || undefined,
      shareCapital:        form.shareCapital || undefined,
      phone:               form.phone || undefined,
      mobile:              form.mobile || undefined,
      email:               form.email || undefined,
      website:             form.website || undefined,
      address:             form.address || undefined,
      addressLine2:        form.addressLine2 || undefined,
      postalCode:          form.postalCode || undefined,
      city:                form.city || undefined,
      country:             form.country || undefined,
      bankHolder:          form.bankHolder || undefined,
      iban:                form.iban || undefined,
      bic:                 form.bic || undefined,
      insurerName:         form.insurerName || undefined,
      insurerPolicy:       form.insurerPolicy || undefined,
      insurerExpiry:       form.insurerExpiry || undefined,
      projectPrefix:       form.projectPrefix || 'CH',
      autoProjectReference: form.autoProjectReference,
      quotePrefix:         form.quotePrefix || undefined,
      invoicePrefix:       form.invoicePrefix || undefined,
      reportPrefix:        form.reportPrefix || undefined,
      defaultVatRate:      form.defaultVatRate ? parseFloat(form.defaultVatRate) : undefined,
      defaultPaymentTerms: form.defaultPaymentTerms || undefined,
      latePaymentPenalties:form.latePaymentPenalties || undefined,
      primaryColor:        form.primaryColor || undefined,
    }, {
      onSuccess: () => toast.success(t('settings.org_saved')),
    })
  }

  const inputCls = 'min-h-[44px]'

  return (
    <>
      <div className="space-y-4 pb-4">
        <SettingsSubHeader title={t('settings.hub_enterprise')} />

        {/* Logo */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            {org?.logoUrl ? (
              <button
                type="button"
                onClick={() => setLogoPreviewOpen(true)}
                className="shrink-0 rounded-lg border bg-muted overflow-hidden transition-opacity hover:opacity-80"
              >
                <img src={org.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
              </button>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground text-2xl font-bold">
                {org?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="logo-upload"
                  className={[
                    'inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                    uploadLogo.isPending ? 'opacity-50 pointer-events-none' : '',
                  ].join(' ')}
                >
                  {uploadLogo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {org?.logoUrl ? t('settings.logo_change_btn') : t('settings.logo_upload_btn')}
                </label>
                {org?.logoUrl && !showDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
                    aria-label={t('settings.logo_delete_btn')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input id="logo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleLogoChange} />
              {showDeleteConfirm && (
                <div className="inline-flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">{t('settings.logo_delete_warning')}</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleteLogo.isPending}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button" variant="destructive" size="sm" disabled={deleteLogo.isPending}
                      onClick={() => void deleteLogo.mutateAsync(undefined, {
                        onSuccess: () => { setShowDeleteConfirm(false); toast.success(t('settings.logo_deleted')) },
                        onError: () => toast.error(t('settings.logo_error')),
                      })}
                    >
                      {deleteLogo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.logo_delete_btn')}
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t('settings.logo_hint')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="text-sm font-medium">{t('settings.primary_color_label')}</label>
            <input
              type="color"
              value={form.primaryColor}
              onChange={f('primaryColor')}
              className="h-9 w-14 cursor-pointer rounded border bg-transparent p-0.5"
            />
            <span className="text-xs text-muted-foreground font-mono">{form.primaryColor}</span>
          </div>
        </Card>

        {orgLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Identité */}
            <Card className="p-4 space-y-4">
              <SectionTitle>{t('settings.org_identity_section')}</SectionTitle>
              <Field label={t('settings.org_name_label')}>
                <div className="relative">
                  <Input className={inputCls} value={form.name} onChange={f('name')} minLength={2} maxLength={30} required />
                  <span className={['absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums', form.name.length >= 30 ? 'text-destructive' : 'text-muted-foreground'].join(' ')}>
                    {form.name.length}/30
                  </span>
                </div>
              </Field>
              <Field label={t('settings.org_trade_name')}>
                <Input className={inputCls} value={form.tradeName} onChange={f('tradeName')} maxLength={100} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.org_siret')}>
                  <Input className={inputCls} value={form.siret} onChange={f('siret')} maxLength={14} placeholder="12345678901234" />
                </Field>
                <Field label={t('settings.org_vat_number')}>
                  <Input className={inputCls} value={form.vatNumber} onChange={f('vatNumber')} maxLength={20} placeholder="FR12345678901" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.org_legal_form')}>
                  <select value={form.legalForm} onChange={f('legalForm')} className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">—</option>
                    <option>Micro-entreprise</option>
                    <option>EI</option>
                    <option>EURL</option>
                    <option>SARL</option>
                    <option>SAS</option>
                    <option>SASU</option>
                    <option>SA</option>
                    <option>Association</option>
                  </select>
                </Field>
                <Field label={t('settings.org_share_capital')}>
                  <Input className={inputCls} value={form.shareCapital} onChange={f('shareCapital')} maxLength={50} placeholder="10 000 €" />
                </Field>
              </div>
            </Card>

            {/* Coordonnées */}
            <Card className="p-4 space-y-4">
              <SectionTitle>{t('settings.org_contact_section')}</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.org_phone')}>
                  <Input className={inputCls} type="tel" value={form.phone} onChange={f('phone')} maxLength={20} />
                </Field>
                <Field label={t('settings.org_mobile')}>
                  <Input className={inputCls} type="tel" value={form.mobile} onChange={f('mobile')} maxLength={20} />
                </Field>
              </div>
              <Field label={t('settings.org_email')}>
                <Input className={inputCls} type="email" value={form.email} onChange={f('email')} maxLength={100} />
              </Field>
              <Field label={t('settings.org_website')}>
                <Input className={inputCls} type="url" value={form.website} onChange={f('website')} maxLength={100} placeholder="https://" />
              </Field>
            </Card>

            {/* Adresse */}
            <Card className="p-4 space-y-4">
              <SectionTitle>{t('settings.org_address_section')}</SectionTitle>
              <Field label={t('settings.org_address')}>
                <Input className={inputCls} value={form.address} onChange={f('address')} maxLength={200} />
              </Field>
              <Field label={t('settings.org_address_line2')}>
                <Input className={inputCls} value={form.addressLine2} onChange={f('addressLine2')} maxLength={200} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.org_postal_code')}>
                  <Input className={inputCls} value={form.postalCode} onChange={f('postalCode')} maxLength={10} />
                </Field>
                <Field label={t('settings.org_city')}>
                  <Input className={inputCls} value={form.city} onChange={f('city')} maxLength={100} />
                </Field>
              </div>
              <Field label={t('settings.org_country')}>
                <Input className={inputCls} value={form.country} onChange={f('country')} maxLength={100} />
              </Field>
            </Card>

            {/* Banque */}
            <Card className="p-4 space-y-4">
              <SectionTitle>{t('settings.org_bank_section')}</SectionTitle>
              <Field label={t('settings.org_bank_holder')}>
                <Input className={inputCls} value={form.bankHolder} onChange={f('bankHolder')} maxLength={100} />
              </Field>
              <Field label={t('settings.org_iban')}>
                <Input className={inputCls} value={form.iban} onChange={f('iban')} maxLength={34} placeholder="FR76 XXXX XXXX XXXX" />
              </Field>
              <Field label={t('settings.org_bic')}>
                <Input className={inputCls} value={form.bic} onChange={f('bic')} maxLength={11} />
              </Field>
            </Card>

            {/* Assurance */}
            <Card className="p-4 space-y-4">
              <SectionTitle>{t('settings.org_insurance_section')}</SectionTitle>
              <Field label={t('settings.org_insurer_name')}>
                <Input className={inputCls} value={form.insurerName} onChange={f('insurerName')} maxLength={100} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('settings.org_insurer_policy')}>
                  <Input className={inputCls} value={form.insurerPolicy} onChange={f('insurerPolicy')} maxLength={50} />
                </Field>
                <Field label={t('settings.org_insurer_expiry')}>
                  <Input className={inputCls} type="date" value={form.insurerExpiry} onChange={f('insurerExpiry')} />
                </Field>
              </div>
            </Card>

            {/* Documents */}
            <Card className="p-4 space-y-4">
              <SectionTitle>{t('settings.org_docs_section')}</SectionTitle>
              <Field label={t('settings.org_language_label')}>
                <select value={form.language} onChange={f('language')} className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="fr">{t('settings.lang_fr')}</option>
                  <option value="en">{t('settings.lang_en')}</option>
                  <option value="es">{t('settings.lang_es')}</option>
                  <option value="it">{t('settings.lang_it')}</option>
                  <option value="de">{t('settings.lang_de')}</option>
                </select>
              </Field>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t('settings.org_auto_reference_label')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.org_auto_reference_hint')}</p>
                </div>
                <Switch
                  checked={form.autoProjectReference}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, autoProjectReference: v }))}
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Field label={t('settings.org_project_prefix')}>
                  <Input className={inputCls} value={form.projectPrefix} onChange={f('projectPrefix')} maxLength={10} disabled={!form.autoProjectReference} />
                </Field>
                <Field label={t('settings.org_quote_prefix')}>
                  <Input className={inputCls} value={form.quotePrefix} onChange={f('quotePrefix')} maxLength={10} />
                </Field>
                <Field label={t('settings.org_invoice_prefix')}>
                  <Input className={inputCls} value={form.invoicePrefix} onChange={f('invoicePrefix')} maxLength={10} />
                </Field>
                <Field label={t('settings.org_report_prefix')}>
                  <Input className={inputCls} value={form.reportPrefix} onChange={f('reportPrefix')} maxLength={10} />
                </Field>
              </div>
              <Field label={t('settings.org_default_vat')}>
                <select value={form.defaultVatRate} onChange={f('defaultVatRate')} className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="0">0 %</option>
                  <option value="5.5">5,5 %</option>
                  <option value="10">10 %</option>
                  <option value="20">20 %</option>
                </select>
              </Field>
              <Field label={t('settings.org_payment_terms')}>
                <select value={form.defaultPaymentTerms} onChange={f('defaultPaymentTerms')} className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">—</option>
                  <option value="immediate">À réception</option>
                  <option value="15">15 jours</option>
                  <option value="30">30 jours</option>
                  <option value="45">45 jours</option>
                  <option value="60">60 jours</option>
                </select>
              </Field>
              <Field label={t('settings.org_late_penalties')}>
                <Input className={inputCls} value={form.latePaymentPenalties} onChange={f('latePaymentPenalties')} maxLength={200} placeholder="3× le taux légal en vigueur" />
              </Field>
            </Card>

            <Button type="submit" className="w-full min-h-[44px]" disabled={updateOrg.isPending || !form.name.trim()}>
              {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('settings.save')}
            </Button>
          </form>
        )}
      </div>

      {/* Lightbox */}
      {logoPreviewOpen && org?.logoUrl && (
        <div
          role="dialog" aria-modal="true" tabIndex={-1}
          onClick={() => setLogoPreviewOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLogoPreviewOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm outline-none"
        >
          <button onClick={() => setLogoPreviewOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
          <img src={org.logoUrl} alt="Logo" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
