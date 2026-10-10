import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useMe, useUpdateMe } from '@/hooks/use-update-me'
import { useAuthStore } from '@/store/auth.store'
import { patchMe } from '@/lib/patch-me'
import { SettingsSubHeader } from './SettingsSubHeader'

export function SettingsProfilPage() {
  const { t, i18n } = useTranslation()
  const { username } = useAuthStore()
  const { data: me } = useMe()
  const updateMe = useUpdateMe()
  // null tant que l'utilisateur n'a rien tapé : le champ montre alors l'adresse enregistrée
  const [typedEmail, setTypedEmail] = useState<string | null>(null)
  const email = typedEmail ?? me?.email ?? ''
  const canSaveEmail = typedEmail !== null && typedEmail.trim() !== '' && typedEmail.trim() !== (me?.email ?? '')

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canSaveEmail) return
    try {
      await updateMe.mutateAsync({ email: email.trim() })
      setTypedEmail(null)
      toast.success(t('settings.email_saved'))
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 409 ? t('settings.email_taken') : t('settings.email_error'))
    }
  }

  function handleLanguageChange(lang: string) {
    localStorage.setItem('drakko-lang', lang)
    void i18n.changeLanguage(lang).then(() => {
      toast.success(i18n.getFixedT(lang)('settings.language_updated'))
    })
    patchMe({ language: lang })
  }

  return (
    <div className="space-y-4 pb-4">
      <SettingsSubHeader title={t('settings.hub_profil')} />

      <Card className="divide-y">
        <div className="p-4 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t('settings.identifier_label')}
          </p>
          <p className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm font-mono">
            {username}
          </p>
        </div>

        <form onSubmit={(e) => { void handleEmailSave(e) }} className="p-4 space-y-1.5">
          <Label htmlFor="profile-email">{t('settings.email_label')}</Label>
          <div className="flex gap-2">
            <Input
              id="profile-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-[44px] text-base"
              value={email}
              onChange={(e) => setTypedEmail(e.target.value)}
              disabled={updateMe.isPending}
            />
            <Button type="submit" className="min-h-[44px]" disabled={!canSaveEmail || updateMe.isPending}>
              {t('settings.save')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.email_hint')}</p>
        </form>

        <div className="p-4 space-y-1.5">
          <Label>{t('settings.language_section')}</Label>
          <select
            value={i18n.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="fr">🇫🇷 {t('settings.lang_fr')}</option>
            <option value="en">🇬🇧 {t('settings.lang_en')}</option>
            <option value="es">🇪🇸 {t('settings.lang_es')}</option>
            <option value="it">🇮🇹 {t('settings.lang_it')}</option>
            <option value="de">🇩🇪 {t('settings.lang_de')}</option>
          </select>
        </div>
      </Card>
    </div>
  )
}
