import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/common/PasswordInput'
import { useResetUserTwoFactor } from '@/hooks/use-two-factor'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error'
import { PASSWORD_MAX_LENGTH } from '@/lib/password-policy'
import { fullName } from '@/lib/utils'
import type { User } from '@/types/api'

// Déblocage : un administrateur réinitialise la double authentification d'un collègue qui a perdu son téléphone
// et ses codes de secours. Il confirme avec SON propre mot de passe ; le collègue est prévenu par email et devra
// la reconfigurer à sa prochaine connexion.
export function ResetTwoFactorButton({ user }: { user: User }) {
  const { t } = useTranslation()
  const reset = useResetUserTwoFactor(user.id)
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [rejected, setRejected] = useState(false)

  // Le champ est désactivé pendant l'envoi : le focus lui revient une fois terminé
  useEffect(() => {
    if (rejected && !reset.isPending) document.getElementById(`reset-2fa-${user.id}`)?.focus()
  }, [rejected, reset.isPending, user.id])

  function close(next: boolean) {
    setOpen(next)
    if (!next) {
      setPassword('')
      setRejected(false)
    }
  }

  async function handleConfirm() {
    if (!password) return
    try {
      await reset.mutateAsync({ currentPassword: password })
      toast.success(t('two_factor.reset_done', { name: fullName(user) }))
      close(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CURRENT_PASSWORD_INVALID') setRejected(true)
      toast.error(apiErrorMessage(err, t, 'two_factor.error'))
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] w-full"
        onClick={() => setOpen(true)}
      >
        {t('two_factor.reset_button')}
      </Button>

      <AlertDialog open={open} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('two_factor.reset_title', { name: fullName(user) })}</AlertDialogTitle>
            <AlertDialogDescription>{t('two_factor.reset_message')}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor={`reset-2fa-${user.id}`}>{t('two_factor.reset_password_label')}</Label>
            <PasswordInput
              id={`reset-2fa-${user.id}`}
              autoComplete="current-password"
              value={password}
              onChange={(value) => {
                setPassword(value)
                setRejected(false)
              }}
              disabled={reset.isPending}
              maxLength={PASSWORD_MAX_LENGTH}
              invalid={rejected}
            />
            {rejected && (
              <p role="alert" className="text-xs text-destructive">
                {t('password_change.current_invalid')}
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={reset.isPending || !password}
              onClick={() => void handleConfirm()}
            >
              {t('two_factor.reset_confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
