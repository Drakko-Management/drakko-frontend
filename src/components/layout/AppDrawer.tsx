import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Settings, LogOut, Monitor, Sun, Moon, LayoutDashboard, HardHat, Users, UserCog, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useTheme } from '@/providers/ThemeProvider'
import { usePermissions } from '@/hooks/use-permissions'
import { apiRequest } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { PermModule } from '@/types/api'

const NAV_ITEMS: { to: string; icon: React.ElementType; labelKey: string; permModule?: PermModule; end?: boolean }[] = [
  { to: '/',             icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/chantiers',   icon: HardHat,         labelKey: 'nav.projects',  permModule: 'chantiers' },
  { to: '/clients',     icon: Users,           labelKey: 'nav.clients',   permModule: 'clients' },
  { to: '/utilisateurs',icon: UserCog,         labelKey: 'nav.team',      permModule: 'equipe' },
  { to: '/prestations', icon: BookOpen,        labelKey: 'nav.services',  permModule: 'prestations' },
]

interface AppDrawerProps {
  open: boolean
  onClose: () => void
}

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { firstName, lastName, username, role, customRoleName, clearAuth } = useAuthStore()
  const { theme, setTheme, handedness } = useTheme()
  const { can } = usePermissions()
  const isLeft = handedness === 'left'

  const visibleNavItems = NAV_ITEMS.filter(
    item => !item.permModule || can(item.permModule, 'read'),
  )

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: t('settings.role_admin'),
    MEMBER: t('users.role_member'),
  }

  const displayName = firstName ? `${firstName} ${lastName}`.trim() : username
  const initial = (firstName || username).charAt(0).toUpperCase()
  const roleLabel = customRoleName ?? (role ? (ROLE_LABELS[role] ?? role) : '')

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleThemeChange(newTheme: 'system' | 'light' | 'dark') {
    setTheme(newTheme)
    void apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ theme: newTheme }),
    })
  }

  async function handleLogout() {
    onClose()
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    clearAuth()
    void navigate('/login', { replace: true })
  }

  function handleSettings() {
    onClose()
    void navigate('/parametres')
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 z-[70] flex h-dvh w-72 flex-col bg-card shadow-xl transition-transform duration-300',
          isLeft ? 'left-0' : 'right-0',
          open ? 'translate-x-0' : (isLeft ? '-translate-x-full' : 'translate-x-full'),
        )}
      >
        {/* Header du drawer */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-sm">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {/* Navigation */}
          <nav className="flex flex-col gap-0.5">
            {visibleNavItems.map(({ to, icon: Icon, labelKey, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

        </div>

        {/* Thème + Paramètres + Déconnexion — fixés en bas */}
        <div className="border-t p-3 space-y-1">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('settings.appearance_section')}
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {(
              [
                { value: 'system', labelKey: 'settings.theme_system', icon: Monitor },
                { value: 'light',  labelKey: 'settings.theme_light',  icon: Sun },
                { value: 'dark',   labelKey: 'settings.theme_dark',   icon: Moon },
              ] as const
            ).map(({ value, labelKey, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors',
                  theme === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </button>
            ))}
          </div>
          <button
            onClick={handleSettings}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            {t('nav.settings')}
          </button>
          <button
            onClick={() => void handleLogout()}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {t('settings.logout')}
          </button>
        </div>
      </div>
    </>
  )
}
