import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/common/PasswordInput'
import { PasswordStrength } from '@/components/common/PasswordStrength'
import { SecondFactorCodeField } from '@/components/two-factor/SecondFactorCodeField'
import { useChangePassword } from '@/hooks/use-change-password'
import { useMe } from '@/hooks/use-update-me'
import { usePasswordCheck } from '@/hooks/use-password-check'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error'
import { PASSWORD_MAX_LENGTH } from '@/lib/password-policy'
import { useAuthStore } from '@/store/auth.store'

// Changer son mot de passe : on donne l'ancien (une session volée ne suffit pas à le remplacer), le nouveau
// suit la règle des mots de passe, et les autres appareils sont déconnectés.
export function ChangePasswordCard() {
  const { t } = useTranslation()
  const { username } = useAuthStore()
  const { data: me } = useMe()
  const change = useChangePassword()

  // Repliée au départ, comme la fiche d'un membre sur la page Équipe : on la déplie pour changer de mot de passe
  const [expanded, setExpanded] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  // Le serveur a refusé l'ancien mot de passe : le message reste sous le champ jusqu'à ce qu'on le corrige
  const [currentRejected, setCurrentRejected] = useState(false)
  // Avec la double authentification, le code est demandé aussi (une session volée ne suffit pas)
  const needsCode = Boolean(me?.totpEnabledAt)
  const [code, setCode] = useState('')
  const [codeRejected, setCodeRejected] = useState(false)

  // Le nouveau mot de passe ne doit pas contenir les informations du compte
  const check = usePasswordCheck(next, [username, me?.email, me?.firstName, me?.lastName])
  const mismatch = confirm.length > 0 && confirm !== next
  // Un « nouveau » mot de passe identique à l'actuel ne changerait rien
  const sameAsCurrent = next.length > 0 && next === current
  const canSubmit =
    current.length > 0 &&
    (!needsCode || code.trim().length > 0) &&
    check.status === 'ok' &&
    !sameAsCurrent &&
    confirm === next &&
    !change.isPending

  // Le champ est désactivé pendant l'envoi, et un champ désactivé ne prend pas le focus : on le lui rend
  // quand l'envoi est terminé et que le serveur a refusé l'ancien mot de passe
  useEffect(() => {
    if (currentRejected && !change.isPending && expanded) {
      document.getElementById('current-password')?.focus()
    }
  }, [currentRejected, change.isPending, expanded])
  useEffect(() => {
    if (codeRejected && !change.isPending && expanded) {
      document.getElementById('change-password-code')?.focus()
    }
  }, [codeRejected, change.isPending, expanded])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    try {
      await change.mutateAsync({
        currentPassword: current,
        newPassword: next,
        ...(needsCode ? { code: code.trim() } : {}),
      })
      setCurrent('')
      setCode('')
      setCodeRejected(false)
      setNext('')
      setConfirm('')
      setCurrentRejected(false)
      setExpanded(false)
      toast.success(t('password_change.success'))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CURRENT_PASSWORD_INVALID') {
        setCurrentRejected(true)
      } else if (err instanceof ApiError && err.code === 'INVALID_TWO_FACTOR_CODE') {
        setCodeRejected(true)
      }
      toast.error(
        err instanceof ApiError && err.status === 429 && !err.code
          ? t('password_reset.too_many')
          : apiErrorMessage(err, t, 'password_change.error'),
      )
    }
  }

  const Chevron = expanded ? ChevronUp : ChevronDown

  return (
    <Card className="divide-y">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="change-password-form"
        className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left transition-colors active:bg-muted"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('password_change.title')}</p>
          <p className="text-xs text-muted-foreground">{t('password_change.collapsed_hint')}</p>
        </div>
        <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {expanded && (
        <form
          id="change-password-form"
          onSubmit={(e) => { void handleSubmit(e) }}
          className="space-y-4 bg-muted/30 p-4"
        >
          <p className="text-xs text-muted-foreground">{t('password_change.intro')}</p>
          {needsCode && <p className="text-xs text-muted-foreground">{t('two_factor.code_last_intro')}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="current-password">{t('password_change.current_label')}</Label>
            <PasswordInput
              id="current-password"
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="change-new-password">{t('password_change.new_label')}</Label>
            <PasswordInput
              id="change-new-password"
              autoComplete="new-password"
              value={next}
              onChange={setNext}
              disabled={change.isPending}
              maxLength={PASSWORD_MAX_LENGTH}
              invalid={sameAsCurrent}
            />
            {sameAsCurrent && (
              <p role="alert" className="text-xs text-destructive">
                {t('password_change.same_as_current')}
              </p>
            )}
            <PasswordStrength check={check} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="change-confirm-password">{t('password_change.confirm_label')}</Label>
            <PasswordInput
              id="change-confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              disabled={change.isPending}
              maxLength={PASSWORD_MAX_LENGTH}
              invalid={mismatch}
            />
            {mismatch && (
              <p role="alert" className="text-xs text-destructive">
                {t('password_change.mismatch')}
              </p>
            )}
          </div>

          {needsCode && (
            <SecondFactorCodeField
              id="change-password-code"
              value={code}
              onChange={(value) => {
                setCode(value)
                setCodeRejected(false)
              }}
              disabled={change.isPending}
              rejected={codeRejected}
            />
          )}

          <Button type="submit" className="min-h-[44px] w-full" disabled={!canSubmit}>
            {change.isPending ? t('password_change.submitting') : t('password_change.submit')}
          </Button>
        </form>
      )}
    </Card>
  )
}
