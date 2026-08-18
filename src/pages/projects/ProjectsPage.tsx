import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HardHat, Plus, Search, X, Zap } from 'lucide-react'
import type { ProjectSort } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Fab } from '@/components/common/Fab'
import { Pagination } from '@/components/common/Pagination'
import { useProjects } from '@/hooks/use-projects'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/types/api'

type StatusFilter = { labelKey: string; value: ProjectStatus | undefined }

const STATUS_FILTERS: StatusFilter[] = [
  { labelKey: 'projects.filter_all',         value: undefined },
  { labelKey: 'projects.filter_draft',       value: 'DRAFT' },
  { labelKey: 'projects.filter_planned',     value: 'PLANNED' },
  { labelKey: 'projects.filter_in_progress', value: 'IN_PROGRESS' },
  { labelKey: 'projects.filter_awaiting_sig',value: 'AWAITING_SIGNATURE' },
  { labelKey: 'projects.filter_completed',   value: 'COMPLETED' },
  { labelKey: 'projects.filter_disputed',    value: 'DISPUTED' },
]

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted min-h-[88px]"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{project.title}</p>
        <p className="text-xs text-muted-foreground">{project.reference}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {project.client && (
          <span className="truncate">
            {project.client.firstName} {project.client.lastName}
          </span>
        )}
        {project.expectedEndDate && (
          <span className="shrink-0">→ {formatDate(project.expectedEndDate)}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted-foreground">{project.address}</p>
        <span className="shrink-0"><StatusBadge status={project.status} /></span>
      </div>
    </button>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = usePermissions()

  const statusParam = searchParams.get('status') as ProjectStatus | null
  const statusFilter = statusParam ?? undefined

  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<ProjectSort>('recent')

  const { data, isLoading } = useProjects({ status: statusFilter, page, limit: 20, sort })

  const query = searchQuery.trim().toLowerCase()
  const projects = data?.data ?? []
  const visible = query
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.reference.toLowerCase().includes(query),
      )
    : projects

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Sticky top: title + search + filters */}
      <div className="shrink-0 space-y-3 px-4 pt-4 pb-3 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t('projects.title')}</h1>
          {can('chantiers', 'create') && (
            <div className="hidden md:flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] gap-1"
                onClick={() => void navigate('/chantiers/express')}
              >
                <Zap className="h-4 w-4" />
                {t('projects.express')}
              </Button>
              <Button
                size="sm"
                className="min-h-[44px]"
                onClick={() => void navigate('/chantiers/nouveau')}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('projects.new')}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={t('projects.search_placeholder')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="h-11 w-full rounded-xl border bg-card pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as ProjectSort); setPage(1) }}
            className="h-11 rounded-xl border bg-card px-3 text-sm text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            aria-label={t('projects.sort_recent')}
          >
            <option value="recent">{t('projects.sort_recent')}</option>
            <option value="start">{t('projects.sort_start')}</option>
            <option value="updated">{t('projects.sort_updated')}</option>
            <option value="title">{t('projects.sort_title')}</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.labelKey}
              onClick={() => {
                setPage(1)
                if (f.value) {
                  setSearchParams({ status: f.value })
                } else {
                  setSearchParams({})
                }
              }}
              className={[
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px]',
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <EmptyState
            icon={HardHat}
            title={query ? t('projects.empty_no_results') : t('projects.empty_title')}
            description={
              query
                ? t('projects.empty_no_results_desc', { query: searchQuery.trim() })
                : statusFilter
                  ? t('projects.empty_status_desc')
                  : t('projects.empty_desc')
            }
            action={
              !query && can('chantiers', 'create')
                ? { label: t('projects.create'), onClick: () => void navigate('/chantiers/nouveau') }
                : undefined
            }
          />
        )}

        <div className="space-y-3 pb-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => void navigate(`/chantiers/${project.id}`)}
            />
          ))}
        </div>
      </div>

      {can('chantiers', 'create') && (
        <>
          <Fab onClick={() => void navigate('/chantiers/nouveau')} />
          <button
            onClick={() => void navigate('/chantiers/express')}
            className="fixed bottom-fab right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-card border shadow-md transition-transform active:scale-95 md:hidden"
            aria-label={t('projects.express')}
          >
            <Zap className="h-5 w-5 text-primary" />
          </button>
        </>
      )}

      {/* Sticky bottom: pagination */}
      <div className="shrink-0 px-4 pb-nav lg:pb-2 pt-1 bg-background">
        {!searchQuery && data && (
          <Pagination
            page={page}
            total={data.total}
            limit={20}
            onChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
