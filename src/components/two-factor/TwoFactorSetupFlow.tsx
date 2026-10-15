import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OtpInput } from '@/components/ui/otp-input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/common/PasswordInput'
import { RecoveryCodesPanel } from '@/components/two-factor/RecoveryCodesPanel'
import { useConfirmTwoFactorSetup, useStartTwoFactorSetup } from '@/hooks/use-two-factor'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error'
import { PASSWORD_MAX_LENGTH } from '@/lib/password-policy'
import type { TwoFactorSetup } from '@/types/api'

interface Props {
  /** Changer d'appareil sur un compte déjà configuré : le code actuel est demandé en plus du mot de passe */
  replacing?: boolean
  onDone: () => void
  onCancel?: () => void
}

const CODE_PATTERN = /^\d{6}$/

// Configuration de la double authentification : mot de passe, QR code à scanner, premier code pour confirmer,
// puis les codes de secours (montrés une seule fois). Le secret reste « en attente » côté serveur jusqu'à la
// confirmation : abandonner en route ne change rien au compte.
export function TwoFactorSetupFlow({ replacing = false, onDone, onCancel }: Props) {
  const { t } = useTranslation()
  const start = useStartTwoFactorSetup()
  const confirm = useConfirmTwoFactorSetup()

  const [password, setPassword] = useState('')
  const [currentCode, setCurrentCode] = useState('')
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  // Refus précis du serveur, affichés sous le champ concerné jusqu'à la correction
  const [passwordRejected, setPasswordRejected] = useState(false)
  const [currentCodeRejected, setCurrentCodeRejected] = useState(false)
  const [codeRejected, setCodeRejected] = useState(false)

  // Un champ désactivé ne prend pas le focus : on le rend une fois l'envoi terminé
  useEffect(() => {
    if (passwordRejected && !start.isPending) document.getElementById('tf-password')?.focus()
  }, [passwordRejected, start.isPending])
  useEffect(() => {
    if (codeRejected && !confirm.isPending) document.getElementById('tf-code')?.focus()
  }, [codeRejected, confirm.isPending])

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!password || (replacing && !currentCode)) return
    try {
      setSetup(await start.mutateAsync({ currentPassword: password, ...(replacing ? { code: currentCode } : {}) }))
      setPassword('')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CURRENT_PASSWORD_INVALID') setPasswordRejected(true)
      else if (err instanceof ApiError && err.code === 'INVALID_TWO_FACTOR_CODE') setCurrentCodeRejected(true)
      toast.error(apiErrorMessage(err, t, 'two_factor.error'))
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!CODE_PATTERN.test(code.replace(/\s/g, ''))) return
    try {
      const result = await confirm.mutateAsync({ code: code.replace(/\s/g, '') })
      setRecoveryCodes(result.recoveryCodes)
      setSetup(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_TWO_FACTOR_CODE') setCodeRejected(true)
      toast.error(apiErrorMessage(err, t, 'two_factor.error'))
    }
  }

  if (recoveryCodes) return <RecoveryCodesPanel codes={recoveryCodes} onDone={onDone} />

  if (setup) {
    return (
      <form onSubmit={(e) => { void handleConfirm(e) }} className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t('two_factor.scan_title')}</h3>
          <p className="text-xs text-muted-foreground">{t('two_factor.scan_intro')}</p>
        </div>

        <img src={setup.qrCode} alt={t('two_factor.qr_alt')} className="mx-auto h-48 w-48 rounded-xl border bg-white p-2" />

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t('two_factor.secret_hint')}</p>
          <p className="break-all rounded-md border bg-muted/40 px-3 py-2 text-center font-mono text-sm tracking-wider">
            {setup.secret}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tf-code">{t('two_factor.first_code_label')}</Label>
          <OtpInput
            id="tf-code"
            value={code}
            onChange={(value) => {
              setCode(value)
              setCodeRejected(false)
            }}
            disabled={confirm.isPending}
            invalid={codeRejected}
          />
          {codeRejected && (
            <p role="alert" className="text-xs text-destructive">
              {t('two_factor.code_invalid')}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="min-h-[44px] w-full"
          disabled={confirm.isPending || !CODE_PATTERN.test(code.replace(/\s/g, ''))}
        >
          {t('two_factor.activate')}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={(e) => { void handleStart(e) }} className="space-y-4">
      <p className="text-xs text-muted-foreground">{t(replacing ? 'two_factor.replace_intro' : 'two_factor.setup_intro')}</p>

      <div className="space-y-1.5">
        <Label htmlFor="tf-password">{t('password_change.current_label')}</Label>
        <PasswordInput
          id="tf-password"
          autoComplete="current-password"
          value={password}
          onChange={(value) => {
            setPassword(value)
            setPasswordRejected(false)
          }}
          disabled={start.isPending}
          maxLength={PASSWORD_MAX_LENGTH}
          invalid={passwordRejected}
        />
        {passwordRejected && (
          <p role="alert" className="text-xs text-destructive">
            {t('password_change.current_invalid')}
          </p>
        )}
      </div>

      {replacing && (
        <div className="space-y-1.5">
          <Label htmlFor="tf-current-code">{t('two_factor.current_code_label')}</Label>
          <Input
            id="tf-current-code"
            autoComplete="one-time-code"
            className={`min-h-[44px] ${currentCodeRejected ? 'border-destructive' : ''}`}
            value={currentCode}
            onChange={(e) => {
              setCurrentCode(e.target.value)
              setCurrentCodeRejected(false)
            }}
            disabled={start.isPending}
            aria-invalid={currentCodeRejected || undefined}
          />
          {currentCodeRejected && (
            <p role="alert" className="text-xs text-destructive">
              {t('two_factor.code_invalid')}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" className="min-h-[44px] flex-1" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          className="min-h-[44px] flex-1"
          disabled={start.isPending || !password || (replacing && !currentCode)}
        >
          {t('two_factor.continue')}
        </Button>
      </div>
    </form>
  )
}
