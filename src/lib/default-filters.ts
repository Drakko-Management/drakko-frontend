import type { ProjectSort } from '@/hooks/use-projects'
import type { ClientSort } from '@/hooks/use-clients'
import type { ProjectStatus } from '@/types/api'

export type ServiceSort = 'az' | 'za' | 'recent'

/** Réglages que l'utilisateur veut trouver déjà appliqués sur ses listes (Paramètres → Filtres). */
export interface DefaultFilters {
  /** 'all' : aucun filtre de statut */
  projectsStatus: ProjectStatus | 'all'
  projectsSort: ProjectSort
  clientsSort: ClientSort
  servicesSort: ServiceSort
}

/** Ce que chaque écran affichait avant que le réglage existe. */
export const FILTER_FALLBACKS: DefaultFilters = {
  projectsStatus: 'all',
  projectsSort: 'recent',
  clientsSort: 'name',
  servicesSort: 'az',
}

export const PROJECT_STATUS_OPTIONS: { value: DefaultFilters['projectsStatus']; labelKey: string }[] = [
  { value: 'all', labelKey: 'projects.filter_all' },
  { value: 'DRAFT', labelKey: 'projects.filter_draft' },
  { value: 'PLANNED', labelKey: 'projects.filter_planned' },
  { value: 'IN_PROGRESS', labelKey: 'projects.filter_in_progress' },
  { value: 'AWAITING_SIGNATURE', labelKey: 'projects.filter_awaiting_sig' },
  { value: 'AWAITING_RESERVE_LIFT', labelKey: 'projects.filter_reserve_lift' },
  { value: 'COMPLETED', labelKey: 'projects.filter_completed' },
  { value: 'DISPUTED', labelKey: 'projects.filter_disputed' },
]

export const PROJECT_SORT_OPTIONS: { value: ProjectSort; labelKey: string }[] = [
  { value: 'recent', labelKey: 'projects.sort_recent' },
  { value: 'start', labelKey: 'projects.sort_start' },
  { value: 'updated', labelKey: 'projects.sort_updated' },
  { value: 'title', labelKey: 'projects.sort_title' },
]

export const CLIENT_SORT_OPTIONS: { value: ClientSort; labelKey: string }[] = [
  { value: 'name', labelKey: 'clients.sort_name' },
  { value: 'recent', labelKey: 'clients.sort_recent' },
  { value: 'updated', labelKey: 'clients.sort_updated' },
]

export const SERVICE_SORT_OPTIONS: { value: ServiceSort; labelKey: string }[] = [
  { value: 'az', labelKey: 'services.sort_az' },
  { value: 'za', labelKey: 'services.sort_za' },
  { value: 'recent', labelKey: 'services.sort_recent' },
]

/** Valeurs enregistrées (éventuellement partielles ou périmées) → réglages complets et valides. */
export function resolveDefaultFilters(stored: Partial<Record<keyof DefaultFilters, unknown>> | null | undefined): DefaultFilters {
  const pick = <T extends string>(key: keyof DefaultFilters, options: { value: T }[], fallback: T): T =>
    options.find((o) => o.value === stored?.[key])?.value ?? fallback
  return {
    projectsStatus: pick('projectsStatus', PROJECT_STATUS_OPTIONS, FILTER_FALLBACKS.projectsStatus),
    projectsSort: pick('projectsSort', PROJECT_SORT_OPTIONS, FILTER_FALLBACKS.projectsSort),
    clientsSort: pick('clientsSort', CLIENT_SORT_OPTIONS, FILTER_FALLBACKS.clientsSort),
    servicesSort: pick('servicesSort', SERVICE_SORT_OPTIONS, FILTER_FALLBACKS.servicesSort),
  }
}
