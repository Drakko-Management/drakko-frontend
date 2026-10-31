import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { endPlatformSession, loadPlatformAdmin, refreshPlatformSession, startPlatformSession } from './api'
import { usePlatformStore } from './store'

// Garde de la section : sans session plateforme on ne voit que la page de connexion. Au chargement (ou après un
// rechargement de la page), le cookie de renouvellement rouvre la session s'il est encore valable.
export function PlatformLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accessToken = usePlatformStore((s) => s.accessToken)
  const admin = usePlatformStore((s) => s.admin)
  const [checking, setChecking] = useState(accessToken === null)

  useEffect(() => {
    if (accessToken !== null) {
      if (!admin) void loadPlatformAdmin().catch(() => undefined)
      return
    }
    let cancelled = false
    void refreshPlatformSession().then(async (renewed) => {
      if (cancelled) return
      if (renewed) {
        startPlatformSession(renewed)
        await loadPlatformAdmin().catch(() => undefined)
      }
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [accessToken, admin])

  if (accessToken === null) {
    if (checking) {
      return (
        <div className="flex h-screen items-center justify-center" role="status" aria-label={t('common.searching')}>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      )
    }
    return <Navigate to="/plateforme/connexion" replace />
  }

  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-semibold">{t('platform.title')}</span>
          <nav className="flex flex-1 flex-wrap gap-1" aria-label={t('platform.title')}>
            <NavLink to="/plateforme" end className={link}>
              {t('platform.nav_organizations')}
            </NavLink>
            <NavLink to="/plateforme/liste-attente" className={link}>
              {t('platform.nav_waitlist')}
            </NavLink>
            <NavLink to="/plateforme/journal" className={link}>
              {t('platform.nav_audit')}
            </NavLink>
          </nav>
          <span className="text-sm text-muted-foreground">{admin?.name}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void endPlatformSession().then(() => navigate('/plateforme/connexion', { replace: true }))
            }}
          >
            <LogOut />
            {t('platform.logout')}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
