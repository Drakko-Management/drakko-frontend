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
 * Ce qu'écrire dans un module suppose de pouvoir lire ailleurs : établir un devis, c'est choisir un client et des
 * prestations parmi ceux de l'entreprise. Les droits restent explicites côté API ; l'éditeur de rôles coche ces
 * lectures avec le droit qui les suppose, sans quoi un rôle « Devis » ne pourrait rien choisir.
 */
const REQUIRED_READS: Partial<Record<PermModule, { when: readonly PermAction[]; needs: readonly PermModule[] }>> = {
  devis: { when: ['create', 'update'], needs: ['clients', 'prestations'] },
}

/** Les modules dont la lecture est exigée par les droits déjà accordés. */
export function requiredReads(permissions: Permissions | null | undefined): Set<PermModule> {
  const needed = new Set<PermModule>()
  for (const [module, rule] of Object.entries(REQUIRED_READS) as [PermModule, NonNullable<(typeof REQUIRED_READS)[PermModule]>][]) {
    if (rule.when.some((action) => (permissions?.[module] ?? []).includes(action))) {
      rule.needs.forEach((other) => needed.add(other))
    }
  }
  return needed
}

/** Les mêmes droits, avec en plus les lectures qu'ils supposent. */
export function withRequiredReads(permissions: Permissions): Permissions {
  const next = { ...permissions }
  for (const module of requiredReads(permissions)) {
    const current = next[module] ?? []
    if (!current.includes('read')) next[module] = ['read', ...current]
  }
  return next
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
