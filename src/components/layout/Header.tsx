import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrganization } from '@/hooks/use-organization'
import { AppDrawer } from './AppDrawer'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { t } = useTranslation()
  const { data: org } = useOrganization()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header
        className={cn(
          'app-header flex h-14 items-center justify-between border-b bg-card px-4',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <img src="/drakko/logo_app_light.png" alt="Drakko" className="h-7 w-7 rounded-lg object-cover dark:hidden" />
          <img src="/drakko/logo_app_dark.png" alt="Drakko" className="h-7 w-7 rounded-lg object-cover hidden dark:block" />
          <span className="font-semibold text-foreground">{org?.name ?? 'Drakko'}</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t('common.menu')}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
