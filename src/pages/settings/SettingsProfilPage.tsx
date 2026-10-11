import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth.store'
import { patchMe } from '@/lib/patch-me'
import { SettingsSubHeader } from './SettingsSubHeader'
import { ChangePasswordCard } from './ChangePasswordCard'
import { ChangeEmailForm } from './ChangeEmailForm'

export function SettingsProfilPage() {
  const { t, i18n } = useTranslation()
  const { username } = useAuthStore()
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

        <ChangeEmailForm />

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

      <ChangePasswordCard />
    </div>
  )
}
