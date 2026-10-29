import { usePermissions } from '@/hooks/use-permissions'
import { APP_MODULES, type AppModuleDefinition } from './registry'

/**
 * Modules que l'utilisateur peut ouvrir, dans l'ordre des menus.
 * Point unique de filtrage : une règle d'accès de plus (module activé pour l'organisation…) se branche ici.
 */
export function useAppModules(): readonly AppModuleDefinition[] {
  const { can } = usePermissions()
  return APP_MODULES.filter((module) => can(module.key, 'read'))
}
