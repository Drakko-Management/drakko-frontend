import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import type { LoginResponse } from '@/types/api'

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  /** Code de l'application ou de secours : demandé quand le compte a la double authentification */
  code?: string
}

/**
 * Change son propre mot de passe (ancien demandé). Le serveur coupe les autres connexions et renvoie de
 * nouveaux jetons pour celle-ci : on les enregistre, la session continue sans se reconnecter.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      apiRequest<LoginResponse>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: ({ accessToken, refreshToken }) => {
      const { username, setAuth } = useAuthStore.getState()
      setAuth(accessToken, username, refreshToken)
    },
  })
}
