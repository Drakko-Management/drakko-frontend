import { HardHat, Users, UserCog, BookOpen } from 'lucide-react'
import type { PermModule } from '@/types/api'

/** Emplacement de la barre du bas : clé stockée sur l'organisation et sur l'utilisateur (`navSlots`). */
export type ModuleSlot = 'chantiers' | 'clients' | 'utilisateurs' | 'prestations'

export interface AppModuleDefinition {
  /** Module de permission : l'entrée n'apparaît que si `can(key, 'read')` */
  key: PermModule
  slot: ModuleSlot
  to: string
  icon: React.ElementType
  /** Libellé court (barre du bas) */
  labelKey: string
  /** Libellé complet (menus, réglages) */
  nameKey: string
  /** Action de création proposée sur le tableau de bord, si `can(key, 'create')` */
  createAction?: { to: string; labelKey: string }
}

/**
 * Registre des modules de l'application, dans l'ordre des menus.
 * Le menu latéral, le tiroir, la barre du bas, les réglages de navigation et le tableau de bord
 * le lisent : ajouter un module commence ici (procédure complète : ADR-027).
 */
export const APP_MODULES: readonly AppModuleDefinition[] = [
  {
    key: 'chantiers',
    slot: 'chantiers',
    to: '/chantiers',
    icon: HardHat,
    labelKey: 'nav.projects',
    nameKey: 'nav.projects',
    createAction: { to: '/chantiers/nouveau', labelKey: 'dashboard.new_project' },
  },
  {
    key: 'clients',
    slot: 'clients',
    to: '/clients',
    icon: Users,
    labelKey: 'nav.clients',
    nameKey: 'nav.clients',
    createAction: { to: '/clients/nouveau', labelKey: 'dashboard.new_client' },
  },
  {
    key: 'equipe',
    slot: 'utilisateurs',
    to: '/utilisateurs',
    icon: UserCog,
    labelKey: 'nav.team',
    nameKey: 'nav.team',
  },
  {
    key: 'prestations',
    slot: 'prestations',
    to: '/prestations',
    icon: BookOpen,
    labelKey: 'nav.services_short',
    nameKey: 'nav.services',
  },
]
