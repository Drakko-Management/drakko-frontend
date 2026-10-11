import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { router } from '@/router'
import { useAuthStore, getStoredRefreshToken } from '@/store/auth.store'
import { useTheme } from '@/providers/ThemeProvider'
import type { ColorKey, Handedness } from '@/providers/ThemeProvider'

const API_URL = import.meta.env.VITE_API_URL

function buildRefreshRequest(): Request {
  const storedToken = getStoredRefreshToken()
  return new Request(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: storedToken ? { 'Content-Type': 'application/json' } : {},
    body: storedToken ? JSON.stringify({ refreshToken: storedToken }) : undefined,
  })
}

// Fired once at module load — survives React StrictMode double-invocation
const sessionRefresh: Promise<{ accessToken: string; refreshToken: string } | null> = fetch(
  buildRefreshRequest(),
)
  .then((res) => (res.ok ? (res.json() as Promise<{ accessToken: string; refreshToken: string }>) : null))
  .catch(() => null)

export function SessionProvider() {
  const [ready, setReady] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setUsername = useAuthStore((s) => s.setUsername)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setName = useAuthStore((s) => s.setName)
  const setPreferences = useAuthStore((s) => s.setPreferences)
  const setPermissions = useAuthStore((s) => s.setPermissions)
  const setNavSlots = useAuthStore((s) => s.setNavSlots)
  const setCustomRoleName = useAuthStore((s) => s.setCustomRoleName)
  const setTwoFactorRequired = useAuthStore((s) => s.setTwoFactorRequired)
  const { setTheme, setColor, setHandedness } = useTheme()
  const { i18n } = useTranslation()

  useEffect(() => {
    void sessionRefresh.then(async (data: { accessToken: string; refreshToken: string } | null) => {
      if (data) {
        setAuth(data.accessToken, sessionStorage.getItem('username') ?? '', data.refreshToken)
        try {
          const res = await fetch(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          })
          if (res.ok) {
            const me = (await res.json()) as {
              username: string; firstName: string; lastName: string
              language: string; theme: string; accentColor: string; handedness: string; navSlots: string[]
              customRole?: { name: string; permissions: Record<string, string[]> } | null
              twoFactorRequired?: boolean
            }
            setUsername(me.username ?? '')
            setName(me.firstName ?? '', me.lastName ?? '')
            setPreferences(me.language, me.theme, me.accentColor)
            setTheme(me.theme as 'system' | 'light' | 'dark')
            setColor(me.accentColor as ColorKey)
            setHandedness(me.handedness as Handedness)
            localStorage.setItem('drakko-lang', me.language)
            void i18n.changeLanguage(me.language)
            setPermissions(me.customRole?.permissions as never ?? null)
            setCustomRoleName(me.customRole?.name ?? null)
            setNavSlots(me.navSlots ?? [])
            setTwoFactorRequired(Boolean(me.twoFactorRequired))
          }
        } catch {
          // ignore — local preferences remain active
        }
      } else {
        clearAuth()
      }
      setReady(true)
    })
  }, [setAuth, setUsername, clearAuth, setName, setTheme, setColor, setHandedness, i18n, setPreferences, setNavSlots, setCustomRoleName, setTwoFactorRequired])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  return <RouterProvider router={router} />
}
