import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { InstallBanner } from '@/components/common/InstallBanner'
import { PwaAutoUpdate } from '@/components/common/PwaAutoUpdate'
import { TutorialProvider } from '@/tutorials/TutorialProvider'
import { useProjectLiveRefresh, useProjectUpdateSync } from '@/hooks/use-project-sync'
import { useSessionSync } from '@/hooks/use-session-sync'
import { useOrganization } from '@/hooks/use-organization'

export function AppShell() {
  const { data: org } = useOrganization()
  useProjectUpdateSync()
  useProjectLiveRefresh()
  useSessionSync()
  return (
    // La numérotation automatique des chantiers change ce que disent les tutoriels (référence à saisir ou non)
    <TutorialProvider textVariants={org?.autoProjectReference ? ['autoref'] : []}>
      <div className="flex h-[100dvh] bg-background">
        <Sidebar className="hidden lg:flex" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header className="lg:hidden" />
          <InstallBanner />
          <PwaAutoUpdate />
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Outlet />
          </main>
          <BottomNav className="lg:hidden" />
        </div>
      </div>
    </TutorialProvider>
  )
}
