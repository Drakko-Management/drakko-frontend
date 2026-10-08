import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, Search, Plus, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Fab } from '@/components/common/Fab'
import { Pagination } from '@/components/common/Pagination'
import { useClients } from '@/hooks/use-clients'
import type { ClientSort } from '@/hooks/use-clients'
import { usePermissions } from '@/hooks/use-permissions'
import { fullName } from '@/lib/utils'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

export function ClientsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { can } = usePermissions()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<ClientSort>('name')

  const { data, isLoading } = useClients({ search: search || undefined, active: true, page, limit: 20, sort })

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Sticky top: title + search */}
      <div className="shrink-0 space-y-3 px-4 pt-4 pb-3 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t('clients.title')}</h1>
          <div className="flex items-center gap-2">
            <TutorialHelpButton scope="clients" />
            {can('clients', 'create') && (
              <Button
                size="sm"
                className="min-h-[44px] hidden md:flex"
                data-tutorial="clients-new"
                onClick={() => void navigate('/clients/nouveau')}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t('clients.new')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="min-h-[44px] pl-9"
              placeholder={t('clients.search_placeholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as ClientSort); setPage(1) }}
            className="h-11 rounded-xl border bg-card px-3 text-sm text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            aria-label={t('clients.sort_name')}
          >
            <option value="name">{t('clients.sort_name')}</option>
            <option value="recent">{t('clients.sort_recent')}</option>
            <option value="updated">{t('clients.sort_updated')}</option>
          </select>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && data?.data.length === 0 && (
          <EmptyState
            icon={Users}
            title={t('clients.empty_title')}
            description={search ? t('clients.empty_no_results') : t('clients.empty_desc')}
            action={{ label: t('clients.new_client'), onClick: () => void navigate('/clients/nouveau') }}
          />
        )}

        {data && data.data.length > 0 && (
          <div className="divide-y rounded-xl border bg-card overflow-hidden mb-3">
            {data.data.map((client) => (
              <button
                key={client.id}
                onClick={() => void navigate(`/clients/${client.id}`)}
                className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {client.firstName[0]}{client.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{fullName(client)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {client.email}
                    {client.phone && ` · ${client.phone}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {can('clients', 'create') && (
        <Fab tutorial="clients-new" onClick={() => void navigate('/clients/nouveau')} />
      )}

      {/* Sticky bottom: pagination */}
      <div className="shrink-0 px-4 pb-nav lg:pb-2 pt-1 bg-background">
        {data && (
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
