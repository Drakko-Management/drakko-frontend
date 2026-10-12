import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { TWO_FACTOR_ROUTE } from './two-factor-route'

export function PrivateRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const twoFactorRequired = useAuthStore((s) => s.twoFactorRequired)
  const { pathname } = useLocation()
  if (!accessToken) return <Navigate to="/login" replace />
  // Un administrateur sans double authentification ne voit que sa configuration (le serveur refuse le reste)
  if (twoFactorRequired && pathname !== TWO_FACTOR_ROUTE) return <Navigate to={TWO_FACTOR_ROUTE} replace />
  return <Outlet />
}
