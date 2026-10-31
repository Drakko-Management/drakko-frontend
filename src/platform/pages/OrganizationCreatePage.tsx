import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/api-error'
import { useCreateOrganization, useWaitlistEntry } from '../hooks'
import { LANGUAGES, TRADES, type CreatedOrganization, type Trade } from '../types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface FormState {
  name: string
  slug: string
  trade: Trade
  language: string
  firstName: string
  lastName: string
  email: string
  username: string
  reason: string
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  trade: 'LANDSCAPER',
  language: 'fr',
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  reason: '',
}

// Création d'une organisation et de son propriétaire (ADR-028). Le propriétaire reçoit par email le lien pour
// choisir son mot de passe. Depuis la liste d'attente, le formulaire arrive rempli avec la fiche de la personne.
export function OrganizationCreatePage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const waitlistId = params.get('liste-attente')
  const { data: entry } = useWaitlistEntry(waitlistId)
  const create = useCreateOrganization()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [created, setCreated] = useState<CreatedOrganization | null>(null)

  useEffect(() => {
    if (!entry) return
    setForm((current) => ({
      ...current,
      name: entry.company ?? current.name,
      trade: entry.trade ?? current.trade,
      language: (LANGUAGES as readonly string[]).includes(entry.language) ? entry.language : current.language,
      firstName: entry.firstName ?? current.firstName,
      email: entry.email,
    }))
  }, [entry])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = (value: string) => value.trim() || undefined
    create.mutate(
      {
        name: form.name.trim(),
        slug: trimmed(form.slug),
        trade: form.trade,
        language: form.language,
        owner: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          username: trimmed(form.username),
        },
        reason: trimmed(form.reason),
        fromWaitlist: waitlistId ?? undefined,
      },
      { onSuccess: setCreated },
    )
  }

  if (created) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{t('platform.created_title', { name: created.organization.name })}</h1>
        <p className="text-sm">{t('platform.created_owner', { username: created.owner.username, email: created.owner.email })}</p>
        <p role="status" className={`text-sm ${created.welcomeEmailSent ? '' : 'text-destructive'}`}>
          {t(created.welcomeEmailSent ? 'platform.created_email_sent' : 'platform.created_email_failed')}
        </p>
        <Button asChild>
          <Link to={`/plateforme/organisations/${created.organization.id}`}>{t('platform.created_open')}</Link>
        </Button>
      </div>
    )
  }

  const valid = form.name.trim() && form.firstName.trim() && form.lastName.trim() && form.email.trim()

  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">{t('platform.create_title')}</h1>
      {waitlistId && <p className="text-sm text-muted-foreground">{t('platform.create_from_waitlist')}</p>}

      <fieldset className="space-y-4">
        <legend className="mb-2 font-medium">{t('platform.create_organization')}</legend>
        <div className="space-y-2">
          <Label htmlFor="org-name">{t('platform.field_name')}</Label>
          <Input id="org-name" value={form.name} onChange={set('name')} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-slug">{t('platform.field_slug')}</Label>
          <Input id="org-slug" value={form.slug} onChange={set('slug')} maxLength={40} autoCapitalize="none" spellCheck={false} />
          <p className="text-xs text-muted-foreground">{t('platform.field_slug_hint')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-trade">{t('platform.field_trade')}</Label>
            <select id="org-trade" className={selectClass} value={form.trade} onChange={set('trade')}>
              {TRADES.map((trade) => (
                <option key={trade} value={trade}>
                  {t(`platform.trade_${trade}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-language">{t('platform.field_language')}</Label>
            <select id="org-language" className={selectClass} value={form.language} onChange={set('language')}>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {t(`platform.language_${lang}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-medium">{t('platform.create_owner')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner-first">{t('common.first_name')}</Label>
            <Input id="owner-first" value={form.firstName} onChange={set('firstName')} maxLength={80} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-last">{t('common.last_name')}</Label>
            <Input id="owner-last" value={form.lastName} onChange={set('lastName')} maxLength={80} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner-email">{t('common.email')}</Label>
          <Input id="owner-email" type="email" value={form.email} onChange={set('email')} maxLength={254} required />
          <p className="text-xs text-muted-foreground">{t('platform.field_owner_email_hint')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner-username">{t('common.identifier')}</Label>
          <Input id="owner-username" value={form.username} onChange={set('username')} maxLength={64} autoCapitalize="none" spellCheck={false} />
          <p className="text-xs text-muted-foreground">{t('platform.field_username_hint')}</p>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="org-reason">{t('platform.field_reason_optional')}</Label>
        <Input id="org-reason" value={form.reason} onChange={set('reason')} maxLength={500} />
      </div>

      {create.error && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(create.error, t, 'platform.create_error')}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending || !valid}>
          {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('platform.create_submit')}
        </Button>
        <Button asChild variant="outline">
          <Link to="/plateforme">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  )
}
