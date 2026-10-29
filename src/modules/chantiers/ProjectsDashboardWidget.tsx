import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  HardHat,
  FileSignature,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useProjects } from '@/hooks/use-projects'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types/api'

// Assez pour un coup d'œil ; la liste complète est à un clic (« Voir tout »)
const RECENT_COUNT = 6

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  color,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: number | undefined
  loading: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col items-center gap-1 rounded-xl border bg-card p-2.5 text-left transition-colors active:bg-muted sm:flex-row sm:gap-3 sm:p-4"
    >
      <div className={`rounded-xl p-1.5 sm:p-2.5 ${color}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="text-center sm:text-left">
        {loading ? (
          <Skeleton className="mb-1 h-5 w-6 sm:h-6 sm:w-8" />
        ) : (
          <p className="text-lg font-bold leading-none sm:text-2xl">{value ?? 0}</p>
        )}
        <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{label}</p>
      </div>
    </button>
  )
}

function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      className="flex min-h-[72px] w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{project.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {project.reference}
          {project.client && ` · ${project.client.firstName} ${project.client.lastName}`}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          {project.expectedEndDate ? (
            <p className="text-xs text-muted-foreground">
              {t('dashboard.expected_end', { date: formatDate(project.expectedEndDate) })}
            </p>
          ) : (
            <span />
          )}
          <StatusBadge status={project.status} />
        </div>
      </div>
    </button>
  )
}

/** Bloc du tableau de bord pour le module Chantiers : compteurs par statut puis chantiers récents. */
export function ProjectsDashboardWidget() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const inProgress = useProjects({ status: 'IN_PROGRESS', limit: 1 })
  const awaitingSig = useProjects({ status: 'AWAITING_SIGNATURE', limit: 1 })
  const completed = useProjects({ status: 'COMPLETED', limit: 1 })
  const disputed = useProjects({ status: 'DISPUTED', limit: 1 })
  const recent = useProjects({ limit: RECENT_COUNT })

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          icon={HardHat}
          label={t('dashboard.stat_in_progress')}
          value={inProgress.data?.total}
          loading={inProgress.isLoading}
          color="bg-amber-100 text-amber-700"
          onClick={() => void navigate('/chantiers?status=IN_PROGRESS')}
        />
        <StatCard
          icon={FileSignature}
          label={t('dashboard.stat_awaiting_sig')}
          value={awaitingSig.data?.total}
          loading={awaitingSig.isLoading}
          color="bg-orange-100 text-orange-700"
          onClick={() => void navigate('/chantiers?status=AWAITING_SIGNATURE')}
        />
        <StatCard
          icon={CheckCircle}
          label={t('dashboard.stat_completed')}
          value={completed.data?.total}
          loading={completed.isLoading}
          color="bg-green-100 text-green-700"
          onClick={() => void navigate('/chantiers?status=COMPLETED')}
        />
        <StatCard
          icon={AlertTriangle}
          label={t('dashboard.stat_disputed')}
          value={disputed.data?.total}
          loading={disputed.isLoading}
          color="bg-red-100 text-red-700"
          onClick={() => void navigate('/chantiers?status=DISPUTED')}
        />
      </div>

      {/* Recent projects */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('dashboard.recent_projects')}</h2>
          <button
            className="flex min-h-[44px] items-center text-xs font-medium text-primary"
            onClick={() => void navigate('/chantiers')}
          >
            {t('dashboard.see_all')}
          </button>
        </div>

        <div className="grid gap-3 pb-4 lg:grid-cols-2">
          {recent.isLoading &&
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}

          {recent.data?.data.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onClick={() => void navigate(`/chantiers/${project.id}`)}
            />
          ))}

          {!recent.isLoading && recent.data?.data.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground lg:col-span-2">
              {t('dashboard.no_projects')}
            </p>
          )}
        </div>
      </section>
    </>
  )
}
