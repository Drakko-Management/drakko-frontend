import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest, ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import { useTheme } from '@/providers/ThemeProvider'
import type { ColorKey } from '@/providers/ThemeProvider'
import type { LoginResponse, MfaChallenge } from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL

export function LoginPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setName = useAuthStore((s) => s.setName)
  const setPreferences = useAuthStore((s) => s.setPreferences)
  const setPermissions = useAuthStore((s) => s.setPermissions)
  const setNavSlots = useAuthStore((s) => s.setNavSlots)
  const setCustomRoleName = useAuthStore((s) => s.setCustomRoleName)
  const setTwoFactorRequired = useAuthStore((s) => s.setTwoFactorRequired)
  const { setTheme, setColor } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  // Après le mot de passe, un compte qui a la double authentification demande un code avant tout jeton
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null)
  const [code, setCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [codeRejected, setCodeRejected] = useState(false)

  // Tokens reçus (directement, ou après le second facteur) : session, préférences du compte, exigence éventuelle
  async function completeLogin(data: LoginResponse, name: string) {
    setAuth(data.accessToken, name, data.refreshToken)

    // Applique immédiatement les préférences du compte qui vient de se connecter
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      })
      if (res.ok) {
        const me = (await res.json()) as {
          firstName: string; lastName: string
          language: string; theme: string; accentColor: string; navSlots: string[]
          customRole?: { name: string; permissions: Record<string, string[]> } | null
          twoFactorRequired?: boolean
        }
        setName(me.firstName ?? '', me.lastName ?? '')
        setPreferences(me.language, me.theme, me.accentColor)
        setTheme(me.theme as 'system' | 'light' | 'dark')
        setColor(me.accentColor as ColorKey)
        localStorage.setItem('drakko-lang', me.language)
        void i18n.changeLanguage(me.language)
        setPermissions(me.customRole?.permissions as never ?? null)
        setCustomRoleName(me.customRole?.name ?? null)
        setNavSlots(me.navSlots ?? [])
        setTwoFactorRequired(Boolean(me.twoFactorRequired))
      }
    } catch {
      // ignore — les préférences par défaut restent actives
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    clearAuth()
    try {
      const data = await apiRequest<LoginResponse | MfaChallenge>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      })
      if ('mfaRequired' in data) {
        setChallenge(data)
        return
      }
      await completeLogin(data, username.trim())
      void navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 401
          ? t('login.error_401')
          : err instanceof ApiError && err.status === 429
            ? t('login.error_locked')
            : t('login.error_generic')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function backToPassword() {
    setChallenge(null)
    setCode('')
    setCodeRejected(false)
    setUseRecovery(false)
  }

  // Second facteur : le code de l'application, ou un code de secours si le téléphone n'est plus là
  async function handleSecondFactor(e: React.FormEvent) {
    e.preventDefault()
    if (!challenge || !code.trim()) return
    setLoading(true)
    try {
      const data = await apiRequest<LoginResponse>('/auth/login/2fa', {
        method: 'POST',
        body: JSON.stringify({ mfaToken: challenge.mfaToken, code: code.trim() }),
      })
      await completeLogin(data, username.trim())
      void navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TWO_FACTOR_SESSION_EXPIRED') {
        backToPassword()
        toast.error(t('two_factor.session_expired'))
      } else if (err instanceof ApiError && err.code === 'INVALID_TWO_FACTOR_CODE') {
        setCodeRejected(true)
        toast.error(t(useRecovery ? 'two_factor.recovery_invalid' : 'two_factor.code_invalid_login'))
      } else {
        toast.error(err instanceof ApiError && err.status === 429 ? t('login.error_locked') : t('login.error_generic'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2">
          <img src="/drakko/logo_light.png" alt="Drakko" className="h-56 w-auto dark:hidden" />
          <img src="/drakko/logo_dark.png" alt="Drakko" className="h-56 w-auto hidden dark:block" />
        </div>

        {challenge ? (
          <form onSubmit={(e) => { void handleSecondFactor(e) }} className="space-y-4">
            <div className="space-y-1 text-center">
              <h1 className="text-lg font-semibold">{t('two_factor.login_title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t(useRecovery ? 'two_factor.login_recovery_intro' : 'two_factor.login_intro')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfa-code">{t(useRecovery ? 'two_factor.recovery_label' : 'two_factor.code_label')}</Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode={useRecovery ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                className={`min-h-[44px] text-center text-lg tracking-widest ${codeRejected ? 'border-destructive' : ''}`}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setCodeRejected(false)
                }}
                disabled={loading}
                aria-invalid={codeRejected || undefined}
                required
              />
              {codeRejected && (
                <p role="alert" className="text-xs text-destructive">
                  {t(useRecovery ? 'two_factor.recovery_invalid' : 'two_factor.code_invalid_login')}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full min-h-[44px] text-base" disabled={loading || !code.trim()}>
              {loading ? t('login.connecting') : t('login.submit')}
            </Button>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => {
                  setUseRecovery((v) => !v)
                  setCode('')
                  setCodeRejected(false)
                }}
              >
                {t(useRecovery ? 'two_factor.use_app_code' : 'two_factor.use_recovery')}
              </button>
              <button type="button" className="underline-offset-4 hover:underline" onClick={backToPassword}>
                {t('common.back')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('login.username_label')}</Label>
              <Input
                id="username"
                type="text"
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
              <Label htmlFor="password">{t('login.password_label')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="min-h-[44px] pr-11 text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
  
            <Button
              type="submit"
              className="w-full min-h-[44px] text-base"
              disabled={loading}
            >
              {loading ? t('login.connecting') : t('login.submit')}
            </Button>
  
            <Link
              to="/mot-de-passe-oublie"
              className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t('login.forgot_link')}
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
