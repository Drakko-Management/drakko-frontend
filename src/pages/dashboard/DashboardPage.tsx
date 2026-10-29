import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/store/auth.store'
import { useAppModules } from '@/modules/use-app-modules'
import { DASHBOARD_WIDGETS } from '@/modules/dashboard-widgets'

export function DashboardPage() {
  const { t } = useTranslation()
  const firstName = useAuthStore((s) => s.firstName)
  const { can } = usePermissions()
  const modules = useAppModules()

  const quickActions = modules.filter((module) => module.createAction && can(module.key, 'create'))
  const widgets = modules.filter((module) => DASHBOARD_WIDGETS[module.key])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{t('dashboard.greeting', { firstName })}</h1>
        <p className="hidden text-sm text-muted-foreground sm:block">{t('dashboard.subtitle')}</p>
      </div>

      {/* Quick actions : une création par module que l'utilisateur peut alimenter */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ key, createAction }) => (
            <Button key={key} asChild variant="outline" className="min-h-[44px]">
              <Link to={createAction!.to}>
                <Plus />
                {t(createAction!.labelKey)}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* Un bloc par module lisible qui en propose un */}
      {widgets.map(({ key }) => {
        const Widget = DASHBOARD_WIDGETS[key]!
        return <Widget key={key} />
      })}

      {widgets.length === 0 && (
        <EmptyState
          icon={LayoutDashboard}
          title={t('dashboard.empty_title')}
          description={t('dashboard.empty_desc')}
        />
      )}
    </div>
  )
}
