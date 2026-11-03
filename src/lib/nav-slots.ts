import { Settings } from 'lucide-react'
import { APP_MODULES, type ModuleSlot } from '@/modules/registry'
import { isModuleActive } from '@/lib/permissions'
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

/**
 * Les emplacements d'une organisation qui n'en a pas choisi, selon ses modules (ADR-029) : « Devis seul » n'a pas
 * Chantiers dans sa barre du bas. Même règle que le back à la création d'une organisation.
 */
export function defaultNavSlots(modules: readonly string[] | null | undefined): NavSlotKey[] {
  if (!modules) return DEFAULT_NAV_SLOTS
  return [...(['chantiers', 'devis'] as const).filter((slot) => modules.includes(slot)), 'clients', 'prestations'].slice(
    0,
    4,
  ) as NavSlotKey[]
}

/** Retire les emplacements dont le module n'est pas actif pour l'organisation : ils ne s'affichent jamais. */
export function activeNavSlots(slots: readonly NavSlotKey[], modules: readonly string[] | null | undefined): NavSlotKey[] {
  return slots.filter((slot) => {
    const module = SLOT_TO_PERM_MODULE[slot]
    return module === null || isModuleActive(modules, module)
  })
}

export const NAV_SLOT_REGISTRY: Record<NavSlotKey, NavSlotEntry> = {
  ...MODULE_SLOTS,
  parametres: { to: '/parametres', icon: Settings, labelKey: 'nav.settings', nameKey: 'nav.settings' },
}

export const ALL_SLOT_KEYS = Object.keys(NAV_SLOT_REGISTRY) as NavSlotKey[]
