import { HardHat, Users, UserCog, BookOpen, Settings } from 'lucide-react'
import type { PermModule } from '@/types/api'

export type NavSlotKey = 'chantiers' | 'clients' | 'utilisateurs' | 'prestations' | 'parametres'

// null : emplacement ouvert à tous (les réglages n'ont pas de module de permission)
export const SLOT_TO_PERM_MODULE: Record<NavSlotKey, PermModule | null> = {
  chantiers: 'chantiers',
  clients: 'clients',
  utilisateurs: 'equipe',
  prestations: 'prestations',
  parametres: null,
}

export const DEFAULT_NAV_SLOTS: NavSlotKey[] = ['chantiers', 'clients', 'prestations']

export const NAV_SLOT_REGISTRY: Record<NavSlotKey, {
  to: string
  icon: React.ElementType
  labelKey: string
  nameKey: string
}> = {
  chantiers:    { to: '/chantiers',    icon: HardHat,  labelKey: 'nav.projects',      nameKey: 'nav.projects' },
  clients:      { to: '/clients',      icon: Users,    labelKey: 'nav.clients',       nameKey: 'nav.clients' },
  utilisateurs: { to: '/utilisateurs', icon: UserCog,  labelKey: 'nav.team',          nameKey: 'nav.team' },
  prestations:  { to: '/prestations',  icon: BookOpen, labelKey: 'nav.services_short', nameKey: 'nav.services' },
  parametres:   { to: '/parametres',   icon: Settings, labelKey: 'nav.settings',      nameKey: 'nav.settings' },
}

export const ALL_SLOT_KEYS = Object.keys(NAV_SLOT_REGISTRY) as NavSlotKey[]
