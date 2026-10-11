import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/common/PasswordInput'
import { useChangeEmail } from '@/hooks/use-change-email'
import { useMe } from '@/hooks/use-update-me'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error'
import { PASSWORD_MAX_LENGTH } from '@/lib/password-policy'

// L'adresse reçoit les liens de réinitialisation du mot de passe : la changer, c'est prendre le compte. On
// demande donc le mot de passe actuel (une session volée ne suffit pas) et l'ancienne adresse est prévenue.
export function ChangeEmailForm() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const change = useChangeEmail()

  // null tant que l'utilisateur n'a rien tapé : le champ montre alors l'adresse enregistrée
  const [typed, setTyped] = useState<string | null>(null)
  const [current, setCurrent] = useState('')
  // Refus précis du serveur, affichés sous le champ concerné jusqu'à la correction
  const [currentRejected, setCurrentRejected] = useState(false)
  const [taken, setTaken] = useState(false)

  const saved = me?.email ?? ''
  const email = typed ?? saved
  const trimmed = email.trim()
  const edited = typed !== null && trimmed !== ''
  const sameAsSaved = edited && saved !== '' && trimmed.toLowerCase() === saved.toLowerCase()
  const changing = edited && !sameAsSaved
  const canSave = changing && current.length > 0 && !change.isPending

  // Le champ est désactivé pendant l'envoi, et un champ désactivé ne prend pas le focus : on le lui rend
  // quand l'envoi est terminé et que le serveur a refusé le mot de passe
  useEffect(() => {
    if (currentRejected && !change.isPending) {
      document.getElementById('profile-email-password')?.focus()
    }
  }, [currentRejected, change.isPending])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    try {
      await change.mutateAsync({ currentPassword: current, email: trimmed })
      toast.success(saved ? t('settings.email_saved_notified') : t('settings.email_saved'))
      setTyped(null)
      setCurrent('')
      setCurrentRejected(false)
      setTaken(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CURRENT_PASSWORD_INVALID') {
        setCurrentRejected(true)
      } else if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setTaken(true)
      }
      toast.error(apiErrorMessage(err, t, 'settings.email_error'))
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-1.5 p-4">
      <Label htmlFor="profile-email">{t('settings.email_label')}</Label>
      <Input
        id="profile-email"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        className={`min-h-[44px] text-base ${taken || sameAsSaved ? 'border-destructive' : ''}`}
        value={email}
        onChange={(e) => {
          setTyped(e.target.value)
          setTaken(false)
        }}
        disabled={change.isPending}
        aria-invalid={taken || sameAsSaved || undefined}
      />
      {taken && (
        <p role="alert" className="text-xs text-destructive">
          {t('settings.email_taken')}
        </p>
      )}
      {sameAsSaved && (
        <p role="alert" className="text-xs text-destructive">
          {t('settings.email_unchanged')}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('settings.email_hint')}</p>

      {changing && (
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="profile-email-password">{t('settings.email_current_label')}</Label>
          <PasswordInput
            id="profile-email-password"
            autoComplete="current-password"
            value={current}
            onChange={(value) => {
              setCurrent(value)
              setCurrentRejected(false)
            }}
            disabled={change.isPending}
            maxLength={PASSWORD_MAX_LENGTH}
            invalid={currentRejected}
          />
          {currentRejected && (
            <p role="alert" className="text-xs text-destructive">
              {t('password_change.current_invalid')}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t('settings.email_current_hint')}</p>
          <Button type="submit" className="mt-1 min-h-[44px] w-full" disabled={!canSave}>
            {t('settings.save')}
          </Button>
        </div>
      )}
    </form>
  )
}
