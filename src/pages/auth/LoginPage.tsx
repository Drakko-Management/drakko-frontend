import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import type { LoginResponse } from '@/types/api'

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
  const { setTheme, setColor } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    clearAuth()
    try {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      })
      setAuth(data.accessToken, username.trim(), data.refreshToken)

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
        }
      } catch {
        // ignore — les préférences par défaut restent actives
      }

      void navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 401
          ? t('login.error_401')
          : t('login.error_generic')
      toast.error(msg)
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
      </div>
    </div>
  )
}
