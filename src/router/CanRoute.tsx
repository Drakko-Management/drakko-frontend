import { Navigate, Outlet } from 'react-router'
import { usePermissions } from '@/hooks/use-permissions'
import type { PermModule, PermAction } from '@/types/api'

interface CanRouteProps {
  module: PermModule
  action: PermAction
}

export function CanRoute({ module, action }: CanRouteProps) {
  const { can } = usePermissions()
  if (!can(module, action)) return <Navigate to="/" replace />
  return <Outlet />
}
