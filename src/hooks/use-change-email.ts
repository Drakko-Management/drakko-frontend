import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'

interface ChangeEmailInput {
  currentPassword: string
  email: string
  /** Code de l'application ou de secours : demandé quand le compte a la double authentification */
  code?: string
}

/**
 * Change sa propre adresse email (mot de passe actuel demandé) : c'est elle qui reçoit les liens de
 * réinitialisation du mot de passe. Le serveur prévient l'ancienne adresse.
 */
export function useChangeEmail() {
  return useMutation({
    mutationFn: (data: ChangeEmailInput) =>
      apiRequest<{ email: string }>('/auth/change-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}
