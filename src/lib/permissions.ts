import type { PermModule, PermAction, Permissions } from '@/types/api'

export const MODULES = ['chantiers', 'clients', 'equipe', 'prestations'] as const
export const ACTIONS = ['read', 'create', 'update', 'delete'] as const

export const EMPTY_PERMISSIONS: Permissions = {
  chantiers: [],
  clients: [],
  equipe: [],
  prestations: [],
}

export const FULL_PERMISSIONS: Permissions = {
  chantiers: ['read', 'create', 'update', 'delete'],
  clients: ['read', 'create', 'update', 'delete'],
  equipe: ['read', 'create', 'update', 'delete'],
  prestations: ['read', 'create', 'update', 'delete'],
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
