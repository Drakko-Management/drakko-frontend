import { Settings } from 'lucide-react'
import { APP_MODULES, type ModuleSlot } from '@/modules/registry'
import type { PermModule } from '@/types/api'

export type NavSlotKey = ModuleSlot | 'parametres'

interface NavSlotEntry {
  to: string
  icon: React.ElementType
  labelKey: string
  nameKey: string
}

// Les emplacements des modules viennent du registre ; les réglages sont hors registre
const MODULE_SLOT_TO_PERM_MODULE = Object.fromEntries(
  APP_MODULES.map((module) => [module.slot, module.key]),
) as Record<ModuleSlot, PermModule>

const MODULE_SLOTS = Object.fromEntries(
  APP_MODULES.map(({ slot, to, icon, labelKey, nameKey }) => [slot, { to, icon, labelKey, nameKey }]),
) as Record<ModuleSlot, NavSlotEntry>

// null : emplacement ouvert à tous (les réglages n'ont pas de module de permission)
export const SLOT_TO_PERM_MODULE: Record<NavSlotKey, PermModule | null> = {
  ...MODULE_SLOT_TO_PERM_MODULE,
  parametres: null,
}

export const DEFAULT_NAV_SLOTS: NavSlotKey[] = ['chantiers', 'clients', 'prestations']

export const NAV_SLOT_REGISTRY: Record<NavSlotKey, NavSlotEntry> = {
  ...MODULE_SLOTS,
  parametres: { to: '/parametres', icon: Settings, labelKey: 'nav.settings', nameKey: 'nav.settings' },
}

export const ALL_SLOT_KEYS = Object.keys(NAV_SLOT_REGISTRY) as NavSlotKey[]
