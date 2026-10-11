import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { useChangeEmail } from './use-change-email'

vi.mock('@/lib/api-client', () => ({ apiRequest: vi.fn() }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

beforeEach(() => vi.clearAllMocks())

describe('useChangeEmail', () => {
  it('envoie le mot de passe actuel et la nouvelle adresse à la route dédiée', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ email: 'nouvelle@acme.test' })
    const { result } = renderHook(() => useChangeEmail(), { wrapper })

    await result.current.mutateAsync({ currentPassword: 'secret', email: 'nouvelle@acme.test' })

    expect(apiRequest).toHaveBeenCalledWith('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'secret', email: 'nouvelle@acme.test' }),
    })
  })

  it('rafraîchit le compte affiché après un changement réussi, pas après un échec', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('refusé'))
    const { result } = renderHook(() => useChangeEmail(), { wrapper })

    await expect(result.current.mutateAsync({ currentPassword: 'x', email: 'a@b.fr' })).rejects.toThrow()
    expect(invalidate).not.toHaveBeenCalled()

    vi.mocked(apiRequest).mockResolvedValueOnce({ email: 'a@b.fr' })
    await result.current.mutateAsync({ currentPassword: 'x', email: 'a@b.fr' })
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] }))
  })
})
