import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/store/auth.store'
import { isWithinPermissions } from '@/lib/permissions'
import type { User } from '@/types/api'

// Seul un administrateur modifie un compte administrateur, et seul le propriétaire modifie le sien. Un membre
// ne modifie que les comptes dont les droits n'excèdent pas les siens (règles aussi appliquées par l'API)
export function useCanEditUser() {
  const { can, isAdmin, permissions } = usePermissions()
  const viewerId = useAuthStore((s) => s.userId)
  const canUpdate = isAdmin || can('equipe', 'update')
  return (u: User) =>
    canUpdate &&
    (isAdmin || u.role !== 'ADMIN') &&
    (!u.isOwner || u.id === viewerId) &&
    (isAdmin || isWithinPermissions(u.customRole?.permissions, permissions))
}
