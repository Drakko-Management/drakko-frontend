import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/common/PasswordInput'
import { RecoveryCodesPanel } from '@/components/two-factor/RecoveryCodesPanel'
import { TwoFactorSetupFlow } from '@/components/two-factor/TwoFactorSetupFlow'
import { useDisableTwoFactor, useRegenerateRecoveryCodes, useTwoFactorStatus } from '@/hooks/use-two-factor'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error'
import { PASSWORD_MAX_LENGTH } from '@/lib/password-policy'
import { useAuthStore } from '@/store/auth.store'

type Mode = null | 'setup' | 'replace' | 'regenerate' | 'disable' | 'codes'

// Double authentification (application d'authentification) : repliée au départ comme les autres cartes du profil.
export function TwoFactorCard() {
  const { t } = useTranslation()
  const { data: status } = useTwoFactorStatus()
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<Mode>(null)
  const [newCodes, setNewCodes] = useState<string[] | null>(null)

  if (!status) return null
  // Sans clé de chiffrement côté serveur, la fonction n'est pas offerte
  if (!status.available) return null

  const Chevron = expanded ? ChevronUp : ChevronDown
  const close = () => {
    setMode(null)
    setNewCodes(null)
  }

  return (
    <Card className="divide-y">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="two-factor-content"
        className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left transition-colors active:bg-muted"
      >
        <ShieldCheck className={`h-5 w-5 shrink-0 ${status.enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('two_factor.title')}</p>
          <p className="text-xs text-muted-foreground">
            {status.enabled ? t('two_factor.status_on') : t('two_factor.status_off')}
          </p>
        </div>
        <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {expanded && (
        <div id="two-factor-content" className="space-y-4 bg-muted/30 p-4">
          {mode === 'setup' || mode === 'replace' ? (
            <TwoFactorSetupFlow replacing={mode === 'replace'} onDone={close} onCancel={close} />
          ) : mode === 'codes' && newCodes ? (
            <RecoveryCodesPanel codes={newCodes} onDone={close} />
          ) : mode === 'regenerate' || mode === 'disable' ? (
            <PasswordAndCodeForm
              kind={mode}
              onCancel={close}
              onCodes={(codes) => {
                setNewCodes(codes)
                setMode('codes')
              }}
              onDone={close}
            />
          ) : status.enabled ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('two_factor.enabled_intro', { count: status.codesLeft })}
              </p>
              {status.codesLeft <= 3 && (
                <p role="alert" className="text-xs text-destructive">
                  {t('two_factor.few_codes_left', { count: status.codesLeft })}
                </p>
              )}
              <Button type="button" variant="outline" className="min-h-[44px] w-full" onClick={() => setMode('replace')}>
                {t('two_factor.replace')}
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px] w-full" onClick={() => setMode('regenerate')}>
                {t('two_factor.regenerate')}
              </Button>
              <RequiredNote />
              <DisableButton onClick={() => setMode('disable')} />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t('two_factor.off_intro')}</p>
              <Button type="button" className="min-h-[44px] w-full" onClick={() => setMode('setup')}>
                {t('two_factor.enable')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// Les administrateurs ne la désactivent pas (obligatoire) : la note remplace le bouton
function DisableButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  const role = useAdminFlag()
  if (role) return null
  return (
    <Button type="button" variant="outline" className="min-h-[44px] w-full text-destructive" onClick={onClick}>
      {t('two_factor.disable')}
    </Button>
  )
}

function RequiredNote() {
  const { t } = useTranslation()
  const isAdmin = useAdminFlag()
  if (!isAdmin) return null
  return <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{t('two_factor.required_note')}</p>
}

// Un administrateur ne peut pas la désactiver : le serveur l'exige de lui (TWO_FACTOR_REQUIRED_FOR_ADMIN)
function useAdminFlag(): boolean {
  return useAuthStore((s) => s.role) === 'ADMIN'
}

// Mot de passe + code : pour renouveler les codes de secours ou désactiver
function PasswordAndCodeForm({
  kind,
  onCancel,
  onCodes,
  onDone,
}: {
  kind: 'regenerate' | 'disable'
  onCancel: () => void
  onCodes: (codes: string[]) => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const disable = useDisableTwoFactor()
  const regenerate = useRegenerateRecoveryCodes()
  const pending = disable.isPending || regenerate.isPending
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [passwordRejected, setPasswordRejected] = useState(false)
  const [codeRejected, setCodeRejected] = useState(false)

  useEffect(() => {
    if (passwordRejected && !pending) document.getElementById('tf-act-password')?.focus()
  }, [passwordRejected, pending])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || !code) return
    try {
      if (kind === 'disable') {
        await disable.mutateAsync({ currentPassword: password, code })
        toast.success(t('two_factor.disabled_done'))
        onDone()
      } else {
        const result = await regenerate.mutateAsync({ currentPassword: password, code })
        onCodes(result.recoveryCodes)
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CURRENT_PASSWORD_INVALID') setPasswordRejected(true)
      else if (err instanceof ApiError && err.code === 'INVALID_TWO_FACTOR_CODE') setCodeRejected(true)
      toast.error(apiErrorMessage(err, t, 'two_factor.error'))
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t(kind === 'disable' ? 'two_factor.disable_intro' : 'two_factor.regenerate_intro')}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="tf-act-password">{t('password_change.current_label')}</Label>
        <PasswordInput
          id="tf-act-password"
          autoComplete="current-password"
          value={password}
          onChange={(value) => {
            setPassword(value)
            setPasswordRejected(false)
          }}
          disabled={pending}
          maxLength={PASSWORD_MAX_LENGTH}
          invalid={passwordRejected}
        />
        {passwordRejected && (
          <p role="alert" className="text-xs text-destructive">
            {t('password_change.current_invalid')}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tf-act-code">{t('two_factor.current_code_label')}</Label>
        <Input
          id="tf-act-code"
          autoComplete="one-time-code"
          className={`min-h-[44px] ${codeRejected ? 'border-destructive' : ''}`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setCodeRejected(false)
          }}
          disabled={pending}
          aria-invalid={codeRejected || undefined}
        />
        {codeRejected && (
          <p role="alert" className="text-xs text-destructive">
            {t('two_factor.code_invalid')}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="min-h-[44px] flex-1" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          className={`min-h-[44px] flex-1 ${kind === 'disable' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          disabled={pending || !password || !code}
        >
          {t(kind === 'disable' ? 'two_factor.disable' : 'two_factor.regenerate')}
        </Button>
      </div>
    </form>
  )
}
