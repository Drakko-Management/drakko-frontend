import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { useUpdateMe } from '@/hooks/use-update-me'
import { usePermissions } from '@/hooks/use-permissions'
import {
  CLIENT_SORT_OPTIONS,
  FILTER_FALLBACKS,
  PROJECT_SORT_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  SERVICE_SORT_OPTIONS,
  type DefaultFilters,
} from '@/lib/default-filters'
import { SettingsSubHeader } from './SettingsSubHeader'

interface FieldProps<T extends string> {
  id: string
  label: string
  value: T
  options: { value: T; labelKey: string }[]
  onChange: (value: T) => void
}

function Field<T extends string>({ id, label, value, options, onChange }: FieldProps<T>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
        ))}
      </select>
    </div>
  )
}

// Filtres et tris que l'utilisateur trouve déjà réglés à l'ouverture de ses listes. Propre à son compte : il le
// suit d'un appareil à l'autre. Chaque changement est enregistré tout de suite, comme le thème.
export function SettingsFiltersPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const filters = useAuthStore((s) => s.defaultFilters)
  const setDefaultFilters = useAuthStore((s) => s.setDefaultFilters)
  const updateMe = useUpdateMe()

  async function save(next: DefaultFilters) {
    const previous = filters
    setDefaultFilters(next)
    try {
      await updateMe.mutateAsync({ defaultFilters: next })
      toast.success(t('settings.filters_saved'))
    } catch {
      setDefaultFilters(previous)
      toast.error(t('settings.save_error'))
    }
  }

  const change = <K extends keyof DefaultFilters>(key: K, value: DefaultFilters[K]) =>
    void save({ ...filters, [key]: value })

  const isDefault = (Object.keys(FILTER_FALLBACKS) as (keyof DefaultFilters)[]).every(
    (k) => filters[k] === FILTER_FALLBACKS[k],
  )

  return (
    <div className="max-w-xl space-y-4 pb-4">
      <SettingsSubHeader title={t('settings.hub_filters')} />
      <p className="text-sm text-muted-foreground">{t('settings.filters_intro')}</p>

      {can('chantiers', 'read') && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t('nav.projects')}</p>
          <Card className="space-y-3 p-4">
            <Field
              id="filter-projects-status"
              label={t('settings.filters_status')}
              value={filters.projectsStatus}
              options={PROJECT_STATUS_OPTIONS}
              onChange={(v) => change('projectsStatus', v)}
            />
            <Field
              id="filter-projects-sort"
              label={t('settings.filters_sort')}
              value={filters.projectsSort}
              options={PROJECT_SORT_OPTIONS}
              onChange={(v) => change('projectsSort', v)}
            />
          </Card>
        </div>
      )}

      {can('clients', 'read') && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t('nav.clients')}</p>
          <Card className="p-4">
            <Field
              id="filter-clients-sort"
              label={t('settings.filters_sort')}
              value={filters.clientsSort}
              options={CLIENT_SORT_OPTIONS}
              onChange={(v) => change('clientsSort', v)}
            />
          </Card>
        </div>
      )}

      {can('prestations', 'read') && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t('nav.services')}</p>
          <Card className="p-4">
            <Field
              id="filter-services-sort"
              label={t('settings.filters_sort')}
              value={filters.servicesSort}
              options={SERVICE_SORT_OPTIONS}
              onChange={(v) => change('servicesSort', v)}
            />
          </Card>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full min-h-[44px]"
        disabled={isDefault || updateMe.isPending}
        onClick={() => void save(FILTER_FALLBACKS)}
      >
        {t('settings.filters_reset')}
      </Button>
    </div>
  )
}
