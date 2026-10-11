import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiRequest } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import { useChangePassword } from './use-change-password'

vi.mock('@/lib/api-client', () => ({ apiRequest: vi.fn() }))

// Un jeton d'accès minimal (la charge est lue par le store : { sub, role, orgId })
const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload))}.y`

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useAuthStore.setState({ accessToken: 'ancien', username: 'lea.martin', role: 'MEMBER', userId: 'u1' })
})

describe('useChangePassword', () => {
  it('envoie l’ancien et le nouveau mot de passe à la route dédiée', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ accessToken: jwt({ sub: 'u1', role: 'MEMBER', orgId: 'o1' }), refreshToken: 'r2' })
    const { result } = renderHook(() => useChangePassword(), { wrapper })

    await result.current.mutateAsync({ currentPassword: 'ancien', newPassword: 'nouveau mot de passe' })

    expect(apiRequest).toHaveBeenCalledWith('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'ancien', newPassword: 'nouveau mot de passe' }),
    })
  })

  it('enregistre les nouveaux jetons : la session en cours continue sans reconnexion', async () => {
    const accessToken = jwt({ sub: 'u1', role: 'MEMBER', orgId: 'o1' })
    vi.mocked(apiRequest).mockResolvedValue({ accessToken, refreshToken: 'nouveau-refresh' })
    const { result } = renderHook(() => useChangePassword(), { wrapper })

    await result.current.mutateAsync({ currentPassword: 'a', newPassword: 'b' })

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe(accessToken))
    expect(useAuthStore.getState().username).toBe('lea.martin')
    expect(Object.values(localStorage)).toContain('nouveau-refresh')
  })

  it('en cas d’échec, la session n’est pas touchée', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('refusé'))
    const { result } = renderHook(() => useChangePassword(), { wrapper })

    await expect(result.current.mutateAsync({ currentPassword: 'x', newPassword: 'y' })).rejects.toThrow()

    expect(useAuthStore.getState().accessToken).toBe('ancien')
  })
})
