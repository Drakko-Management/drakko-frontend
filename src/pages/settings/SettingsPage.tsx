import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, User, Palette, Building2, LayoutGrid, Smartphone, GraduationCap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { InstallModal } from '@/components/common/InstallModal'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface HubRowProps {
  icon: React.ElementType
  iconClass: string
  label: string
  sub: string
  onClick: () => void
}

function HubRow({ icon: Icon, iconClass, label, sub, onClick }: HubRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin } = usePermissions()
  const { isInstalled, isMobile } = usePwaInstall()
  const [installOpen, setInstallOpen] = useState(false)

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold">{t('settings.title')}</h1>

      {/* Mon compte */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t('settings.account_section')}</p>
        <Card className="divide-y overflow-hidden p-0">
          <HubRow
            icon={User}
            iconClass="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
            label={t('settings.hub_profil')}
            sub={t('settings.hub_profil_sub')}
            onClick={() => navigate('/parametres/profil')}
          />
          <HubRow
            icon={Palette}
            iconClass="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
            label={t('settings.hub_appearance')}
            sub={t('settings.hub_appearance_sub')}
            onClick={() => navigate('/parametres/apparence')}
          />
          <HubRow
            icon={GraduationCap}
            iconClass="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
            label={t('settings.hub_tutorials')}
            sub={t('settings.hub_tutorials_sub')}
            onClick={() => navigate('/parametres/tutoriels')}
          />
        </Card>
      </div>

      {/* Organisation (admin) */}
      {isAdmin && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t('settings.org_section')}</p>
          <Card className="divide-y overflow-hidden p-0">
            <HubRow
              icon={Building2}
              iconClass="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              label={t('settings.hub_enterprise')}
              sub={t('settings.hub_enterprise_sub')}
              onClick={() => navigate('/parametres/entreprise')}
            />
            <HubRow
              icon={LayoutGrid}
              iconClass="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
              label={t('settings.hub_nav_org')}
              sub={t('settings.hub_nav_org_sub')}
              onClick={() => navigate('/parametres/navigation')}
            />
          </Card>
        </div>
      )}

      {/* PWA install */}
      {isMobile && !isInstalled && (
        <>
          <Button
            variant="outline"
            className="w-full min-h-[48px] gap-2"
            onClick={() => setInstallOpen(true)}
          >
            <Smartphone className="h-4 w-4" />
            {t('install.settings_btn')}
          </Button>
          <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} />
        </>
      )}

      {isMobile && isInstalled && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-medium text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
          <Smartphone className="h-3.5 w-3.5" />
          {t('install.installed_label')}
        </div>
      )}
    </div>
  )
}
