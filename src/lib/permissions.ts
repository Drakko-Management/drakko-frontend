import type { PermModule, PermAction, Permissions } from '@/types/api'

export const MODULES = ['chantiers', 'clients', 'equipe', 'prestations', 'devis'] as const
export const ACTIONS = ['read', 'create', 'update', 'delete'] as const

/**
 * Les modules qu'une organisation peut avoir ou non (ADR-029), sous-ensemble de MODULES. Clients, Prestations et
 * Équipe sont toujours là. Même liste que `ACTIVABLE_MODULES` du back (`organization-modules.ts`) : un test de chaque
 * côté signale un oubli.
 */
export const ACTIVABLE_MODULES: readonly PermModule[] = ['chantiers', 'devis']

/**
 * Vrai quand l'organisation a ce module. `modules` null : la liste n'est pas (encore) connue, on ne masque rien ;
 * l'API reste seule juge (`403 MODULE_NOT_ACTIVE`).
 */
export function isModuleActive(modules: readonly string[] | null | undefined, module: PermModule): boolean {
  return !ACTIVABLE_MODULES.includes(module) || !modules || modules.includes(module)
}

export const EMPTY_PERMISSIONS: Permissions = {
  chantiers: [],
  clients: [],
  equipe: [],
  prestations: [],
  devis: [],
}

export const FULL_PERMISSIONS: Permissions = {
  chantiers: ['read', 'create', 'update', 'delete'],
  clients: ['read', 'create', 'update', 'delete'],
  equipe: ['read', 'create', 'update', 'delete'],
  prestations: ['read', 'create', 'update', 'delete'],
  devis: ['read', 'create', 'update', 'delete'],
}

export function can(
  permissions: Permissions | null | undefined,
  module: PermModule,
  action: PermAction,
): boolean {
  if (!permissions) return false
  return (permissions[module] ?? []).includes(action)
}

export function makePermissions(partial: Partial<Permissions>): Permissions {
  return { ...EMPTY_PERMISSIONS, ...partial }
}

/**
 * Vrai quand tout ce que `candidate` accorde, `allowed` l'accorde aussi, module par module.
 * Même règle que l'API : un membre n'accorde pas plus de droits que les siens.
 */
export function isWithinPermissions(
  candidate: Partial<Permissions> | null | undefined,
  allowed: Partial<Permissions> | null | undefined,
): boolean {
  return MODULES.every((module) => {
    const granted = allowed?.[module] ?? []
    return (candidate?.[module] ?? [])
      .filter((action) => ACTIONS.includes(action))
      .every((action) => granted.includes(action))
  })
}
