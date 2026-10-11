import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type { TwoFactorSetup, TwoFactorStatus } from '@/types/api'

const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: ['2fa'] })
  void queryClient.invalidateQueries({ queryKey: ['me'] })
  void queryClient.invalidateQueries({ queryKey: ['users'] })
}

/** État de la double authentification de son propre compte (jamais le secret). */
export function useTwoFactorStatus() {
  return useQuery({
    queryKey: ['2fa'],
    queryFn: () => apiRequest<TwoFactorStatus>('/auth/2fa'),
  })
}

/** Commence la configuration (ou le changement d'appareil : le code actuel est alors demandé en plus). */
export function useStartTwoFactorSetup() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; code?: string }) =>
      apiRequest<TwoFactorSetup>('/auth/2fa/setup', { method: 'POST', body: JSON.stringify(data) }),
  })
}

/** Confirme avec le premier code de l'appareil : active, et renvoie les codes de secours (montrés une seule fois). */
export function useConfirmTwoFactorSetup() {
  return useMutation({
    mutationFn: (data: { code: string }) =>
      apiRequest<{ recoveryCodes: string[] }>('/auth/2fa/enable', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; code: string }) =>
      apiRequest<void>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

export function useRegenerateRecoveryCodes() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; code: string }) =>
      apiRequest<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

/** Déblocage : un administrateur réinitialise la double authentification d'un collègue (avec SON mot de passe). */
export function useResetUserTwoFactor(userId: string) {
  return useMutation({
    mutationFn: (data: { currentPassword: string }) =>
      apiRequest<void>(`/auth/2fa/reset/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}
