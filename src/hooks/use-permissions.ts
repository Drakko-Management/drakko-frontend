import { useAuthStore } from '@/store/auth.store'
import { FULL_PERMISSIONS, EMPTY_PERMISSIONS, can as canFn, isModuleActive } from '@/lib/permissions'
import type { PermModule, PermAction, Permissions } from '@/types/api'

export function usePermissions() {
  const { role, permissions, modules } = useAuthStore()
  const isAdmin = role === 'ADMIN'

  const effective: Permissions = isAdmin ? FULL_PERMISSIONS : (permissions ?? EMPTY_PERMISSIONS)

  return {
    // Un module que l'organisation n'a pas est fermé à tous, administrateur compris (ADR-029) : sans cela
    // l'administrateur garderait des boutons qui répondent 403
    can: (module: PermModule, action: PermAction): boolean =>
      isModuleActive(modules, module) && (isAdmin || canFn(effective, module, action)),
    isModuleActive: (module: PermModule): boolean => isModuleActive(modules, module),
    isAdmin,
    permissions: effective,
  }
}
