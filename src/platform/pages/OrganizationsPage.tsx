import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/common/Pagination'
import { apiErrorMessage } from '@/lib/api-error'
import { PAGE_SIZE, useOrganizations } from '../hooks'

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      }`}
    >
      {t(active ? 'platform.state_active' : 'platform.state_suspended')}
    </span>
  )
}

export function OrganizationsPage() {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useOrganizations(q, page)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t('platform.organizations_title')}</h1>
        <Button asChild>
          <Link to="/plateforme/organisations/nouvelle">
            <Plus />
            {t('platform.organization_new')}
          </Link>
        </Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setQ(draft.trim())
          setPage(1)
        }}
        role="search"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('platform.search_placeholder')}
          aria-label={t('platform.search_placeholder')}
        />
        <Button type="submit" variant="outline" aria-label={t('platform.search')}>
          <Search />
        </Button>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.searching')}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t, 'platform.load_error')}</p>}
      {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">{t('platform.organizations_empty')}</p>}

      {data && data.items.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {data.items.map((org) => (
            <li key={org.id}>
              <Link to={`/plateforme/organisations/${org.id}`} className="grid gap-1 px-4 py-3 hover:bg-accent sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{org.name}</span>
                    <ActiveBadge active={org.active} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {org.slug}
                    {org.owner && ` · ${org.owner.firstName} ${org.owner.lastName}`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground sm:text-right">
                  {t('platform.counts', { users: org.usersCount, projects: org.projectsCount })}
                  <br />
                  {t('platform.created_on', { date: new Date(org.createdAt).toLocaleDateString(i18n.language) })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data && <Pagination page={page} total={data.total} limit={PAGE_SIZE} onChange={setPage} />}
    </div>
  )
}
