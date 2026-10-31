import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OtpInput } from '@/components/ui/otp-input'
import { apiErrorMessage } from '@/lib/api-error'
import { loadPlatformAdmin, platformPublicRequest, startPlatformSession } from '../api'
import type { EnrolmentSetup, LoginStep } from '../types'

type Step =
  | { name: 'password' }
  | { name: 'code'; mfaToken: string }
  | { name: 'enrol'; enrolmentToken: string; setup: EnrolmentSetup }
  | { name: 'recovery'; codes: string[] }

interface Session {
  accessToken: string
  recoveryCodes?: string[]
}

// Connexion des super admins (ADR-028) : mot de passe, puis le code de l'application. Un compte qui n'a pas encore
// d'appareil le configure ici même, avant d'obtenir la moindre session.
export function PlatformLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ name: 'password' })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingSession, setPendingSession] = useState<string | null>(null)

  async function run(action: () => Promise<void>, fallbackKey: string) {
    setLoading(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(apiErrorMessage(err, t, fallbackKey))
    } finally {
      setLoading(false)
    }
  }

  async function open(accessToken: string) {
    startPlatformSession(accessToken)
    await loadPlatformAdmin().catch(() => undefined)
    void navigate('/plateforme', { replace: true })
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    void run(async () => {
      const next = await platformPublicRequest<LoginStep>('/platform/auth/login', { username: username.trim(), password })
      setPassword('')
      if ('mfaRequired' in next) {
        setStep({ name: 'code', mfaToken: next.mfaToken })
        return
      }
      const setup = await platformPublicRequest<EnrolmentSetup>('/platform/auth/enrol/setup', {
        enrolmentToken: next.enrolmentToken,
      })
      setStep({ name: 'enrol', enrolmentToken: next.enrolmentToken, setup })
    }, 'platform.login_error')
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault()
    if (step.name === 'code') {
      const { mfaToken } = step
      void run(async () => {
        const session = await platformPublicRequest<Session>('/platform/auth/login/2fa', { mfaToken, code: code.trim() })
        await open(session.accessToken)
      }, 'platform.login_error')
    } else if (step.name === 'enrol') {
      const { enrolmentToken } = step
      void run(async () => {
        const session = await platformPublicRequest<Session>('/platform/auth/enrol/confirm', {
          enrolmentToken,
          code: code.trim(),
        })
        // La session est prête, mais les codes de secours ne se montrent qu'une fois : on les affiche d'abord
        setPendingSession(session.accessToken)
        setStep({ name: 'recovery', codes: session.recoveryCodes ?? [] })
      }, 'platform.login_error')
    }
  }

  function back() {
    setStep({ name: 'password' })
    setCode('')
    setError(null)
    setUseRecovery(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">{t('platform.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('platform.login_subtitle')}</p>
        </div>

        {step.name === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-username">{t('login.username_label')}</Label>
              <Input
                id="platform-username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="min-h-[44px] text-base"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-password">{t('login.password_label')}</Label>
              <Input
                id="platform-password"
                type="password"
                autoComplete="current-password"
                className="min-h-[44px] text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="min-h-[44px] w-full text-base" disabled={loading || !username.trim() || !password}>
              {loading ? t('login.connecting') : t('login.submit')}
            </Button>
          </form>
        )}

        {(step.name === 'code' || step.name === 'enrol') && (
          <form onSubmit={submitCode} className="space-y-4">
            {step.name === 'enrol' && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold">{t('platform.enrol_title')}</h2>
                <p className="text-sm text-muted-foreground">{t('platform.enrol_intro')}</p>
                <img
                  src={step.setup.qrCode}
                  alt={t('platform.enrol_qr_alt')}
                  className="mx-auto h-48 w-48 rounded-md border bg-white p-2"
                />
                <p className="text-xs text-muted-foreground">{t('platform.enrol_manual')}</p>
                <code className="block break-all rounded-md bg-muted px-2 py-1.5 text-center text-sm">{step.setup.secret}</code>
              </div>
            )}
            {step.name === 'code' && (
              <div className="space-y-1 text-center">
                <h2 className="text-base font-semibold">{t('two_factor.login_title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t(useRecovery ? 'two_factor.login_recovery_intro' : 'two_factor.login_intro')}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="platform-code">
                {t(useRecovery && step.name === 'code' ? 'two_factor.recovery_label' : 'two_factor.code_label')}
              </Label>
              {useRecovery && step.name === 'code' ? (
                <Input
                  id="platform-code"
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  className="min-h-[44px] text-center text-lg tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  required
                />
              ) : (
                <OtpInput id="platform-code" autoFocus value={code} onChange={setCode} disabled={loading} required />
              )}
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="min-h-[44px] w-full text-base" disabled={loading || !code.trim()}>
              {loading ? t('login.connecting') : t(step.name === 'enrol' ? 'platform.enrol_confirm' : 'login.submit')}
            </Button>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {step.name === 'code' ? (
                <button
                  type="button"
                  className="underline-offset-4 hover:underline"
                  onClick={() => {
                    setUseRecovery((v) => !v)
                    setCode('')
                    setError(null)
                  }}
                >
                  {t(useRecovery ? 'two_factor.use_app_code' : 'two_factor.use_recovery')}
                </button>
              ) : (
                <span />
              )}
              <button type="button" className="underline-offset-4 hover:underline" onClick={back}>
                {t('common.back')}
              </button>
            </div>
          </form>
        )}

        {step.name === 'recovery' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">{t('platform.recovery_title')}</h2>
            <p className="text-sm text-muted-foreground">{t('platform.recovery_intro')}</p>
            <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted p-3 font-mono text-sm" data-testid="recovery-codes">
              {step.codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <Button
              className="min-h-[44px] w-full text-base"
              disabled={loading}
              onClick={() => {
                if (pendingSession) void run(() => open(pendingSession), 'platform.login_error')
              }}
            >
              {t('platform.recovery_done')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
